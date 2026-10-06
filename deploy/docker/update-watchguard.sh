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

exec 9>"${LOCK_FILE}"
flock -n 9 || exit 0

cd "${APP_DIR}"
compose() { docker compose --env-file .env -f "${COMPOSE_FILE}" "$@"; }

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
