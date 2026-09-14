#!/usr/bin/env bash
#
# Take a verified, consistent backup of the study database and retire old ones.
#
# The portal has held real learner accounts and progress since 1.1.0, and until now backing it up
# was a two-command manual procedure in the deployment notes. A procedure a human has to remember,
# name a file for, and copy off the host is a procedure that does not run.
#
# The data lives in a named Docker volume, so it survives image updates and rollbacks. What it does
# not survive is `docker compose down -v`, volume corruption, a bad restore, or losing the host.
#
# Order matters here: verify the new backup BEFORE pruning anything. A backup that is valid SQLite
# and empty (DATA_DIR pointing somewhere unexpected, a database reset) would otherwise count as a
# success and take the good history with it.
#
# Nothing here needs Node.js on the host. The backup and the verification both run with the Node
# runtime inside the portal's own image, which is the version the database was written by.
set -Eeuo pipefail

APP_DIR="${WATCHGUARD_APP_DIR:-/opt/watchguard-study-portal}"
COMPOSE_FILE="${APP_DIR}/compose.production.yml"
SERVICE="${WATCHGUARD_SERVICE:-watchguard-study-portal}"
BACKUP_DIR="${WATCHGUARD_BACKUP_DIR:-/var/backups/watchguard-study}"
KEEP_DAYS="${WATCHGUARD_BACKUP_KEEP_DAYS:-30}"
KEEP_MIN="${WATCHGUARD_BACKUP_KEEP_MIN:-7}"
# Set to the number of accounts you expect to exist. 1 catches the empty-database case without
# needing maintenance; raise it if you want a stronger floor.
MIN_ACCOUNTS="${WATCHGUARD_BACKUP_MIN_ACCOUNTS:-1}"
LOCK_FILE="/run/lock/watchguard-study-backup.lock"
UPDATE_LOCK_FILE="/run/lock/watchguard-study-update.lock"

# Never overlap with another backup.
exec 9>"${LOCK_FILE}"
flock -n 9 || exit 0

# Hold the updater's lock too, so it cannot replace the container halfway through a backup. The
# updater takes that lock non-blocking and skips its tick while we hold it; we wait for an update
# already in progress to finish rather than failing.
exec 8>"${UPDATE_LOCK_FILE}"
if ! flock -w 900 8; then
  echo "An update held the deployment lock for 15 minutes; no backup taken." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${BACKUP_DIR}/study-${stamp}.sqlite"
in_container="/data/.backup-${stamp}.sqlite"

install -d -m 700 "${BACKUP_DIR}"

compose() { docker compose --env-file "${APP_DIR}/.env" -f "${COMPOSE_FILE}" "$@"; }

# Always clear the staging file inside the volume, including on failure; /data is the one writable
# path in a read-only container and a half-written backup left there wastes space silently.
cleanup() { compose exec -T "${SERVICE}" rm -f "${in_container}" >/dev/null 2>&1 || true; }
trap cleanup EXIT

container_id="$(compose ps -q "${SERVICE}")"
if [[ -z "${container_id}" ]]; then
  echo "The ${SERVICE} container is not running; no backup taken." >&2
  exit 1
fi

# VACUUM INTO produces a consistent copy while the service keeps serving, and includes committed
# WAL data that a plain file copy of study.sqlite would miss. The copy is an ordinary rollback-journal
# database, so it can be opened read-only below without creating -wal or -shm files.
compose exec -T "${SERVICE}" node scripts/backup.mjs "${in_container}"
docker cp "${container_id}:${in_container}" "${target}"
chmod 600 "${target}"

# Verify with the running image's Node, in a throwaway container with no network, a read-only root
# filesystem and both mounts read-only. It runs as root only so it can read the 0600 backup file.
image_id="$(docker inspect --format '{{.Image}}' "${container_id}")"
if ! docker run --rm --network none --read-only --user 0:0 --entrypoint node \
       -v "${target}:/verify/study.sqlite:ro" \
       -v "${APP_DIR}/scripts/verify-backup.mjs:/verify/scripts/verify-backup.mjs:ro" \
       "${image_id}" /verify/scripts/verify-backup.mjs /verify/study.sqlite --min-accounts "${MIN_ACCOUNTS}"; then
  echo "Backup ${target} failed verification and is kept for inspection; older backups are NOT being pruned." >&2
  mv "${target}" "${target}.rejected"
  exit 1
fi

# Only now that a good backup exists is it safe to retire old ones, and never below the floor.
total="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'study-*.sqlite' -type f | wc -l)"
if (( total > KEEP_MIN )); then
  # Oldest first, stopping before the floor, and only those past the age limit.
  surplus=$(( total - KEEP_MIN ))
  while IFS= read -r old; do
    (( surplus-- <= 0 )) && break
    rm -f -- "${old}"
    echo "Pruned ${old}"
  done < <(find "${BACKUP_DIR}" -maxdepth 1 -name 'study-*.sqlite' -type f -mtime "+${KEEP_DAYS}" -printf '%T@ %p\n' \
           | sort -n | cut -d' ' -f2-)
fi

echo "Backup complete: ${target}"
