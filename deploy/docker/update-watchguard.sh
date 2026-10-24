#!/usr/bin/env bash
#
# Deploy origin/main to the homelab Docker host: build a commit-tagged image, start it, wait for the
# container health check, and roll back to the previous image if it never becomes healthy.
#
# Installed as /usr/local/sbin/update-watchguard and run every five minutes by watchguard-update.timer.
# Editing this file changes nothing on the host until it is installed again.
set -Eeuo pipefail

APP_DIR="${WATCHGUARD_APP_DIR:-/opt/watchguard-study-portal}"
BRANCH="${WATCHGUARD_BRANCH:-main}"
COMPOSE_FILE="${APP_DIR}/compose.production.yml"
DEPLOYED_FILE="${APP_DIR}/.deployed-commit"
# A commit that failed its health check. It is not tried again until main moves past it, or the file
# is deleted. The updater used to retry it every tick, and each retry replaced the healthy rolled-back
# container with the broken one for up to 90 seconds.
FAILED_FILE="${APP_DIR}/.failed-commit"
LOCK_FILE="${WATCHGUARD_UPDATE_LOCK:-/run/lock/watchguard-study-update.lock}"
IMAGE="watchguard-study-portal"
# Commit-tagged images to keep, counting the running one and the rollback target. Every deploy tags a
# new image and `docker image prune` only removes untagged ones, so without this every image ever
# deployed stays on the disk.
KEEP_IMAGES="${WATCHGUARD_KEEP_IMAGES:-3}"
# true: back up the database before replacing the container, and deploy anyway if that fails.
# required: refuse to deploy without a verified backup. false: skip it.
PREDEPLOY_BACKUP="${WATCHGUARD_PREDEPLOY_BACKUP:-true}"
# Leave build headroom instead of discovering a full filesystem halfway through extraction.
MIN_FREE_KB="${WATCHGUARD_MIN_FREE_KB:-4194304}"
MIN_FREE_INODES="${WATCHGUARD_MIN_FREE_INODES:-50000}"
for value in "${MIN_FREE_KB}" "${MIN_FREE_INODES}" "${KEEP_IMAGES}"; do
  if [[ ! "${value}" =~ ^[1-9][0-9]{0,8}$ ]]; then
    echo "Disk thresholds and WATCHGUARD_KEEP_IMAGES must be positive integers (at most nine digits)." >&2
    exit 1
  fi
done

exec 9>"${LOCK_FILE}"
flock -n 9 || exit 0

cd "${APP_DIR}"
compose() { docker compose --env-file .env -f "${COMPOSE_FILE}" "$@"; }

# Docker can keep image layers in containerd on another filesystem. Check that store too when
# present; a custom containerd root can be supplied without changing the Docker daemon settings.
docker_root="$(docker info --format '{{.DockerRootDir}}')"
if [[ -z "${docker_root}" || ! -d "${docker_root}" ]]; then
  echo "Cannot locate Docker storage; refusing to deploy without a capacity check." >&2
  exit 1
fi
storage_paths=("${APP_DIR}" "${docker_root}")
containerd_root="${WATCHGUARD_CONTAINERD_DIR:-/var/lib/containerd}"
if [[ -d "${containerd_root}" ]]; then
  storage_paths+=("${containerd_root}")
elif [[ -n "${WATCHGUARD_CONTAINERD_DIR:-}" ]]; then
  echo "Configured containerd storage path does not exist: ${containerd_root}" >&2
  exit 1
fi

storage_has_headroom() {
  local storage_path free_kb free_inodes low=0
  for storage_path in "${storage_paths[@]}"; do
    if ! free_kb="$(LC_ALL=C df -Pk -- "${storage_path}" | awk 'NR==2 {print $4}')" ||
       ! free_inodes="$(LC_ALL=C df -Pi -- "${storage_path}" | awk 'NR==2 {print $4}')"; then
      echo "Cannot measure storage at ${storage_path}; refusing to deploy." >&2
      return 2
    fi
    if [[ ! "${free_kb}" =~ ^[0-9]+$ || ! "${free_inodes}" =~ ^[0-9]+$ ]]; then
      echo "Invalid storage measurements at ${storage_path}; refusing to deploy." >&2
      return 2
    fi
    if (( free_kb < MIN_FREE_KB || free_inodes < MIN_FREE_INODES )); then
      echo "Low storage at ${storage_path}: ${free_kb} KiB and ${free_inodes} inodes available; need ${MIN_FREE_KB} KiB and ${MIN_FREE_INODES} inodes." >&2
      low=1
    fi
  done
  return "${low}"
}

ensure_headroom() {
  local result
  if storage_has_headroom; then return 0; else result=$?; fi
  # A failed measurement must not trigger cleanup based on a guess.
  if (( result != 1 )); then return "${result}"; fi
  echo "Reclaiming unused Docker build cache older than seven days before deployment." >&2
  docker builder prune -af --filter 'until=168h' || echo "Build-cache cleanup failed; rechecking actual free space." >&2
  if storage_has_headroom; then
    echo "Storage headroom restored."
  else
    echo "Storage preflight failed. The running container and data volumes are unchanged. Free space or expand storage, then retry watchguard-update.service." >&2
    return 1
  fi
}

# Run even on an otherwise idle tick, and before Git needs room to fetch objects. Low space is
# an operational failure, not a bad application commit: never write .failed-commit for this.
ensure_headroom
git fetch --quiet origin "${BRANCH}"
target_commit="$(git rev-parse "origin/${BRANCH}")"
current_commit="$(cat "${DEPLOYED_FILE}" 2>/dev/null || true)"
failed_commit="$(cat "${FAILED_FILE}" 2>/dev/null || true)"

if [[ "${target_commit}" == "${current_commit}" ]] && \
   docker inspect --format '{{.State.Health.Status}}' "${IMAGE}" 2>/dev/null | grep -qx healthy; then
  exit 0
fi

if [[ "${target_commit}" == "${failed_commit}" ]]; then
  # Exit non-zero so `systemctl --failed` keeps showing that main is not what is running.
  echo "${BRANCH} is still at ${target_commit}, which failed its health check; serving ${current_commit:-the previous container}." >&2
  echo "Push a fix, or delete ${FAILED_FILE} to try this commit again." >&2
  exit 1
fi

previous_commit="${current_commit}"
ensure_headroom
git reset --hard "${target_commit}"

export WATCHGUARD_IMAGE_TAG="${target_commit}"
compose build --pull "${IMAGE}"

# Back up while the old container is still serving, so a release with a schema change can be undone.
# The new commit's backup script is used: it is the one that knows not to wait for the lock we hold.
if [[ "${PREDEPLOY_BACKUP}" != "false" && -n "${previous_commit}" ]]; then
  if ! WATCHGUARD_UPDATE_LOCK_HELD=true bash "${APP_DIR}/deploy/docker/backup-watchguard.sh"; then
    if [[ "${PREDEPLOY_BACKUP}" == "required" ]]; then
      echo "Pre-deploy backup failed and WATCHGUARD_PREDEPLOY_BACKUP=required; not deploying ${target_commit}." >&2
      git reset --hard "${previous_commit}"
      exit 1
    fi
    echo "Pre-deploy backup failed; deploying ${target_commit} anyway." >&2
  fi
fi

# Removes commit-tagged images beyond KEEP_IMAGES, newest kept first. The running image and the
# rollback target are always kept; an image a container still uses cannot be removed and is skipped.
prune_images() {
  local keep_running="$1" keep_rollback="$2" kept=0 tag
  local -a others=()
  [[ -n "${keep_running}" ]] && kept=$((kept + 1))
  [[ -n "${keep_rollback}" && "${keep_rollback}" != "${keep_running}" ]] && kept=$((kept + 1))
  while IFS= read -r tag; do
    [[ -z "${tag}" || "${tag}" == "<none>" || "${tag}" == "${keep_running}" || "${tag}" == "${keep_rollback}" ]] && continue
    others+=("${tag}")
  done < <(docker image ls "${IMAGE}" --format '{{.Tag}}')
  for tag in "${others[@]}"; do
    if (( kept < KEEP_IMAGES )); then kept=$((kept + 1)); continue; fi
    docker image rm "${IMAGE}:${tag}" >/dev/null 2>&1 && echo "Removed old image ${IMAGE}:${tag}" || true
  done
  docker image prune -f >/dev/null
  docker builder prune -f --filter 'until=168h' >/dev/null 2>&1 || true
}

if compose up -d --no-deps --wait --wait-timeout 90 "${IMAGE}"; then
  printf '%s\n' "${target_commit}" > "${DEPLOYED_FILE}"
  rm -f "${FAILED_FILE}"
  prune_images "${target_commit}" "${previous_commit}"
  exit 0
fi

echo "Deployment ${target_commit} failed its health check; rolling back." >&2
printf '%s\n' "${target_commit}" > "${FAILED_FILE}"
if [[ -n "${previous_commit}" ]] && docker image inspect "${IMAGE}:${previous_commit}" >/dev/null 2>&1; then
  # Put the checkout back too, so the backup job and the next run read the files that match what runs.
  git reset --hard "${previous_commit}"
  export WATCHGUARD_IMAGE_TAG="${previous_commit}"
  compose up -d --no-deps --wait --wait-timeout 90 "${IMAGE}"
fi
exit 1
