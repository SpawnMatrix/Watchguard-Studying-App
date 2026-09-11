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

## Restore / rollback

Stop the app before a database restore. Preserve the current database and its `-wal`/`-shm` sidecars together as a recovery copy. Restore the chosen consistent backup as `study.sqlite` in the same mounted volume; do not combine a restored database with stale WAL/SHM files. Start the app, sign in with a test learner, and verify progress before restoring access to the team.

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
