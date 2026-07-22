#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${WATCHGUARD_APP_DIR:-/opt/watchguard-study-portal}"
BRANCH="${WATCHGUARD_BRANCH:-main}"
COMPOSE_FILE="${APP_DIR}/compose.production.yml"
DEPLOYED_FILE="${APP_DIR}/.deployed-commit"
LOCK_FILE="/run/lock/watchguard-study-update.lock"

exec 9>"${LOCK_FILE}"
flock -n 9 || exit 0

cd "${APP_DIR}"
git fetch --quiet origin "${BRANCH}"
target_commit="$(git rev-parse "origin/${BRANCH}")"
current_commit="$(cat "${DEPLOYED_FILE}" 2>/dev/null || true)"

if [[ "${target_commit}" == "${current_commit}" ]] && \
   docker inspect --format '{{.State.Health.Status}}' watchguard-study-portal 2>/dev/null | grep -qx healthy; then
  exit 0
fi

previous_commit="${current_commit}"
git reset --hard "${target_commit}"

export WATCHGUARD_IMAGE_TAG="${target_commit}"
docker compose --env-file .env -f "${COMPOSE_FILE}" build --pull watchguard-study-portal

if docker compose --env-file .env -f "${COMPOSE_FILE}" up -d --no-deps --wait --wait-timeout 90 watchguard-study-portal; then
  printf '%s\n' "${target_commit}" > "${DEPLOYED_FILE}"
  docker image prune -f --filter 'until=168h' >/dev/null
  exit 0
fi

echo "Deployment ${target_commit} failed its health check; rolling back." >&2
if [[ -n "${previous_commit}" ]] && docker image inspect "watchguard-study-portal:${previous_commit}" >/dev/null 2>&1; then
  export WATCHGUARD_IMAGE_TAG="${previous_commit}"
  docker compose --env-file .env -f "${COMPOSE_FILE}" up -d --no-deps --wait --wait-timeout 90 watchguard-study-portal
fi
exit 1
