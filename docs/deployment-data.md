# Durable deployment and recovery

Node **22.13 or later** is required for the built-in SQLite API; the image remains `node:22-alpine`. No native database npm module or external database service is required.

Both Compose files mount `study-data` at `/data` and set `DATA_DIR=/data`. Compose prefixes the volume with its project name. Keep the same Compose file/project name on upgrades so the application uses the same volume. Do not use `docker compose down -v` for a routine update. Accounts and progress are not baked into the image or committed to Git.

The existing updater, port mapping, health endpoint (`/api/session`), image tagging, and rollback process remain. Initial accounts are created when users open the upgraded app. Existing browser progress can be imported during registration. Main is automatically deployed by the existing updater; review and merge the PR only when ready for that rollout.

## Back up

Create a consistent backup while the service is running (VACUUM INTO includes committed WAL data):

```sh
docker compose -f compose.production.yml exec watchguard-study-portal node scripts/backup.mjs /data/study-backup.sqlite
docker cp watchguard-study-portal:/data/study-backup.sqlite ./study-backup.sqlite
```

Use a new filename each time; the script refuses to overwrite an existing file. Store copies outside the container host with restricted access. The database contains account hashes, sessions, and learner progress. Downloaded user progress exports contain study data only; they are not a replacement for an operator database backup.

For a direct Node deployment, set DATA_DIR to a durable directory and run `node scripts/backup.mjs /path/to/new-backup.sqlite`. Include this directory in the host's backup plan.

### Automated daily backups

`deploy/docker/backup-watchguard.sh`, with its systemd service and timer, turns the manual procedure into a nightly job. **Nothing runs until you install it.** Merging this into `main` changes nothing on the host by itself.

Each run:

1. Waits for any update in progress and holds the updater's lock, so the container is not replaced mid-backup.
2. Takes a consistent `VACUUM INTO` copy inside the running container.
3. Copies it to `/var/backups/watchguard-study/study-<UTC timestamp>.sqlite` with mode `0600`.
4. Verifies it using the Node runtime from the portal's own image, in a throwaway container with no network and read-only mounts. Node is not needed on the host. It runs SQLite's integrity check, confirms every application table is present, and requires at least one account.
5. Only after verification passes, deletes backups older than 30 days, always keeping at least the 7 newest.

A backup that fails verification is renamed to `.rejected` and kept for inspection, and nothing is pruned. The job then exits with an error, so `systemctl --failed` shows it.

Install on the Docker host, from the updater's checkout:

```sh
cd /opt/watchguard-study-portal
sudo install -m 755 deploy/docker/backup-watchguard.sh /usr/local/sbin/backup-watchguard
sudo install -m 644 deploy/docker/watchguard-backup.service deploy/docker/watchguard-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now watchguard-backup.timer
sudo systemctl start watchguard-backup.service
journalctl -u watchguard-backup.service -n 30 --no-pager
```

The last two commands run a backup immediately and show its result. A good run ends with `Backup verified: …` and `Backup complete: …`.

These environment variables tune the job. Set them with `sudo systemctl edit watchguard-backup.service` under `[Service]` as `Environment=NAME=value`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `WATCHGUARD_BACKUP_DIR` | `/var/backups/watchguard-study` | Where backups are kept |
| `WATCHGUARD_BACKUP_KEEP_DAYS` | `30` | Backups older than this may be pruned |
| `WATCHGUARD_BACKUP_KEEP_MIN` | `7` | Never keep fewer than this many |
| `WATCHGUARD_BACKUP_MIN_ACCOUNTS` | `1` | Reject a backup with fewer accounts than this |
| `WATCHGUARD_APP_DIR` | `/opt/watchguard-study-portal` | The updater's checkout |

Backups on the same host do not survive losing the host. Copy `WATCHGUARD_BACKUP_DIR` somewhere else as well, for example with Proxmox Backup Server or a nightly `rsync` to another machine.

To check a backup by hand at any time, run the same verifier in a throwaway container:

```sh
image="$(docker inspect --format '{{.Image}}' watchguard-study-portal)"
docker run --rm --network none --read-only --user 0:0 --entrypoint node \
  -v /var/backups/watchguard-study/study-<timestamp>.sqlite:/verify/study.sqlite:ro \
  -v /opt/watchguard-study-portal/scripts/verify-backup.mjs:/verify/scripts/verify-backup.mjs:ro \
  "$image" /verify/scripts/verify-backup.mjs /verify/study.sqlite --min-accounts 1
```

## Restore / rollback

Stop the app before a database restore. Preserve the current database and its `-wal`/`-shm` sidecars together as a recovery copy. Restore the chosen consistent backup as `study.sqlite` in the same mounted volume; do not combine a restored database with stale WAL/SHM files. Start the app, sign in with a test learner, and verify progress before restoring access to the team.

Restoring an automated backup on the Docker host looks like this. Verify the backup first, as shown above, then:

```sh
cd /opt/watchguard-study-portal
sudo systemctl stop watchguard-update.timer watchguard-backup.timer
docker compose --env-file .env -f compose.production.yml stop watchguard-study-portal
# Compose names the volume <project>_study-data; the project is watchguard-study.
volume=watchguard-study_study-data
image="$(docker inspect --format '{{.Image}}' watchguard-study-portal)"
backup=/var/backups/watchguard-study/study-<timestamp>.sqlite
# Keep the current database and its sidecars, then put the backup in place with no stale WAL/SHM.
docker run --rm --network none --user 0:0 --entrypoint sh -v "$volume":/data -v "$(dirname "$backup")":/backups:ro "$image" -c \
  "mkdir -p /data/pre-restore && mv /data/study.sqlite* /data/pre-restore/ 2>/dev/null; cp /backups/$(basename "$backup") /data/study.sqlite && chown 1000:1000 /data/study.sqlite"
docker compose --env-file .env -f compose.production.yml start watchguard-study-portal
sudo systemctl start watchguard-update.timer watchguard-backup.timer
```

The container runs as the `node` user (uid 1000), so the restored file must be owned by that user. Remove `/data/pre-restore` only after you have confirmed the restored data.

Schema version 1 only creates new account tables; no prior application database existed in the active runtime. Rolling the image back to the previous release leaves the new volume intact but the older app will not provide account synchronization. Keep the new database backup for a subsequent upgrade. Browser legacy study keys remain compatible.

## Checks

```sh
npm ci
npm run lint
npm test
npm run build
# With a test production instance running (creates a disposable learner):
node scripts/smoke.mjs
```

`SMOKE_URL` overrides localhost:3000. Set `SMOKE_USERNAME` for a repeatable test identity. After restarting/replacing the instance with the same data directory, set `SMOKE_VERIFY=true` to check that learner's saved progress. Do not point smoke tests at production learner accounts.

HTTPS is expected for remote access. Session cookies are Secure when Express recognizes HTTPS through the existing trusted-proxy configuration. Configure the reverse proxy consistently with that existing trust boundary. Learner PINs are intentionally lightweight; per-account and per-IP limits, a recovery code, and hashed storage protect the study account flow. The separate administrator password still protects AI controls.

## Check which version is running

The footer shows the package release version, build commit (when supplied), creator credit, and Last built in the viewer's timezone. `/api/version` returns the release version, commit, and ISO build timestamp without authentication. Compose uses the existing updater’s WATCHGUARD_IMAGE_TAG as the build commit, so the installed updater script does not need replacement. The footer abbreviates it; the API retains the supplied identifier. Vite bakes the build timestamp into both the frontend and dist/build-info.json; the production server reads that file. GitHub Actions can supply an explicit timestamp, and local Docker builds automatically stamp the compilation time. Refreshing the page or restarting the same image does not change it. Dev mode shows Development preview.

The supplied `watchguard-update.timer` runs two minutes after boot and then every five minutes, with up to 30 seconds of randomized delay. An open PR does not deploy; the updater follows `main` by default. This requires the timer to be installed and enabled on the Docker host.

On that host, inspect it with:

```sh
systemctl status watchguard-update.timer
systemctl list-timers watchguard-update.timer
journalctl -u watchguard-update.service -n 50 --no-pager
curl -fsS http://127.0.0.1:3001/api/version
```

After an approved merge, run `sudo systemctl start watchguard-update.service` to trigger the existing update workflow immediately instead of waiting for the next timer tick. This uses the same build, health check, and rollback logic. Keep the named data volume intact.
