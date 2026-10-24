import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * The updater runs on the Docker host, where nothing in CI executes it. These tests run the real
 * script under bash with stand-ins for docker, git and flock that record what they were asked to do,
 * so its decisions (deploy, roll back, refuse a known-bad commit, prune images) are checked here
 * rather than discovered in production.
 */
const script = path.join(__dirname, '../deploy/docker/update-watchguard.sh');
const source = readFileSync(script, 'utf8');

function findBash() {
  const candidates = process.platform === 'win32'
    ? ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files/Git/usr/bin/bash.exe']
    : ['/bin/bash', '/usr/bin/bash'];
  return candidates.find(existsSync);
}
const bash = findBash();
const slash = p => p.replace(/\\/g, '/');
/** Git for Windows' bash puts its own bin directories first, so the stand-ins are prepended from inside bash. */
const posix = p => process.platform === 'win32' ? slash(p).replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : p;

const FAKE_DOCKER = `#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_STATE/log"
images="$FAKE_STATE/images"
case "$1" in
  info) echo "$FAKE_STATE/docker"; exit 0 ;;
  inspect) [[ -f "$FAKE_STATE/healthy" ]] && echo healthy; exit 0 ;;
  compose)
    shift
    while [[ "$1" == --env-file || "$1" == -f ]]; do shift 2; done
    case "$1" in
      build) { echo "$WATCHGUARD_IMAGE_TAG"; grep -vx "$WATCHGUARD_IMAGE_TAG" "$images" || true; } > "$images.new"; mv "$images.new" "$images"; exit 0 ;;
      up)
        if [[ "$WATCHGUARD_IMAGE_TAG" == "$FAKE_BAD" ]]; then rm -f "$FAKE_STATE/healthy"; exit 1; fi
        touch "$FAKE_STATE/healthy"; echo "$WATCHGUARD_IMAGE_TAG" > "$FAKE_STATE/running"; exit 0 ;;
    esac ;;
  image)
    case "$2" in
      inspect) grep -qx "\${3#*:}" "$images" ;;
      ls) cat "$images" ;;
      rm) grep -vx "\${3#*:}" "$images" > "$images.new" || true; mv "$images.new" "$images" ;;
      prune) exit 0 ;;
    esac ;;
  builder) touch "$FAKE_STATE/pruned"; exit 0 ;;
esac
`;
const FAKE_GIT = `#!/usr/bin/env bash
echo "git $*" >> "$FAKE_STATE/log"
case "$1" in
  fetch) exit 0 ;;
  rev-parse) cat "$FAKE_STATE/target" ;;
  reset) echo "$3" > "$FAKE_STATE/checkout" ;;
esac
`;
const FAKE_BACKUP = `#!/usr/bin/env bash
echo "backup lock_held=\${WATCHGUARD_UPDATE_LOCK_HELD:-unset}" >> "$FAKE_STATE/log"
exit "\${FAKE_BACKUP_EXIT:-0}"
`;
const FAKE_DF = `#!/usr/bin/env bash
echo "df $*" >> "$FAKE_STATE/log"
[[ "\${FAKE_DF_FAIL:-0}" == 1 ]] && exit 1
available=20000000
if [[ "$1" == -Pi ]]; then available=1000000; fi
if [[ ! -f "$FAKE_STATE/pruned" || "\${FAKE_PRUNE_RECOVERS:-0}" != 1 ]]; then
  if [[ "$1" == -Pk ]]; then available="\${FAKE_FREE_KB:-20000000}"; fi
  if [[ "$1" == -Pi ]]; then available="\${FAKE_FREE_INODES:-1000000}"; fi
  if [[ "\${FAKE_DOCKER_LOW:-0}" == 1 && "\${*: -1}" == "$FAKE_STATE/docker" ]]; then available=0; fi
  if [[ "\${FAKE_CONTAINERD_LOW:-0}" == 1 && "\${*: -1}" == "$FAKE_STATE/containerd" ]]; then available=0; fi
fi
echo "Filesystem Blocks Used Available Capacity Mounted"
echo "fake 30000000 1000000 $available 10% /"
`;

let dir;
const state = name => { try { return readFileSync(path.join(dir, 'state', name), 'utf8').trim(); } catch { return null; } };
const log = () => state('log') ?? '';

function run(target, { bad = '', backupExit = 0, env = {} } = {}) {
  writeFileSync(path.join(dir, 'state', 'target'), target + '\n');
  writeFileSync(path.join(dir, 'state', 'log'), '');
  const result = spawnSync(bash, ['-c', 'export PATH="$FAKE_BIN:$PATH"; exec bash "$1"', 'bash', slash(script)], {
    encoding: 'utf8',
    env: {
      ...process.env,
      FAKE_BIN: posix(path.join(dir, 'bin')),
      FAKE_STATE: slash(path.join(dir, 'state')), FAKE_BAD: bad, FAKE_BACKUP_EXIT: String(backupExit),
      WATCHGUARD_APP_DIR: slash(path.join(dir, 'app')), WATCHGUARD_UPDATE_LOCK: slash(path.join(dir, 'update.lock')),
      WATCHGUARD_CONTAINERD_DIR: slash(path.join(dir, 'state', 'containerd')),
      ...env,
    },
  });
  return { status: result.status, stderr: result.stderr, log: log() };
}

describe.skipIf(!bash)('updater behaviour', () => {
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'wg-update-'));
    for (const d of ['bin', 'state/docker', 'state/containerd', 'app/deploy/docker']) mkdirSync(path.join(dir, d), { recursive: true });
    writeFileSync(path.join(dir, 'bin', 'docker'), FAKE_DOCKER, { mode: 0o755 });
    writeFileSync(path.join(dir, 'bin', 'git'), FAKE_GIT, { mode: 0o755 });
    writeFileSync(path.join(dir, 'bin', 'df'), FAKE_DF, { mode: 0o755 });
    writeFileSync(path.join(dir, 'bin', 'flock'), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
    writeFileSync(path.join(dir, 'app', 'deploy', 'docker', 'backup-watchguard.sh'), FAKE_BACKUP, { mode: 0o755 });
    writeFileSync(path.join(dir, 'state', 'images'), '');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('deploys a new commit and does nothing while it is running and healthy', () => {
    expect(run('aaa').status).toBe(0);
    expect(state('running')).toBe('aaa');
    expect(readFileSync(path.join(dir, 'app', '.deployed-commit'), 'utf8').trim()).toBe('aaa');
    const again = run('aaa');
    expect(again.status).toBe(0);
    expect(again.log).not.toMatch(/compose/);
  });

  it('backs up before replacing a running container, without waiting on its own lock', () => {
    run('aaa');
    const first = log();
    expect(first).not.toMatch(/backup/); // Nothing was deployed before, so there is nothing to back up.
    const next = run('bbb');
    expect(next.status).toBe(0);
    expect(next.log).toMatch(/backup lock_held=true/);
    expect(next.log.indexOf('backup')).toBeLessThan(next.log.indexOf(' up -d'));
  });

  it('rolls back a commit that fails its health check and does not retry it every tick', () => {
    run('aaa');
    const failed = run('bad', { bad: 'bad' });
    expect(failed.status).toBe(1);
    expect(state('running')).toBe('aaa');
    expect(state('checkout')).toBe('aaa'); // The checkout matches what runs again.
    expect(readFileSync(path.join(dir, 'app', '.failed-commit'), 'utf8').trim()).toBe('bad');

    const retry = run('bad', { bad: 'bad' });
    expect(retry.status).toBe(1);
    expect(retry.log).not.toMatch(/ (build --pull|up -d) /);
    expect(retry.stderr).toMatch(/failed its health check/);
    expect(state('running')).toBe('aaa');

    expect(run('fixed').status).toBe(0);
    expect(state('running')).toBe('fixed');
    expect(existsSync(path.join(dir, 'app', '.failed-commit'))).toBe(false);
  });

  it('keeps the running image, the rollback image and the newest others, and removes the rest', () => {
    for (const commit of ['c1', 'c2', 'c3', 'c4', 'c5']) run(commit);
    const images = state('images').split('\n');
    expect(images).toEqual(['c5', 'c4', 'c3']);
  });

  it('honours WATCHGUARD_KEEP_IMAGES', () => {
    for (const commit of ['c1', 'c2', 'c3', 'c4']) run(commit, { env: { WATCHGUARD_KEEP_IMAGES: '2' } });
    expect(state('images').split('\n')).toEqual(['c4', 'c3']);
  });

  it('deploys anyway when a default pre-deploy backup fails, and refuses when one is required', () => {
    run('aaa');
    expect(run('bbb', { backupExit: 1 }).status).toBe(0);
    expect(state('running')).toBe('bbb');

    const refused = run('ccc', { backupExit: 1, env: { WATCHGUARD_PREDEPLOY_BACKUP: 'required' } });
    expect(refused.status).toBe(1);
    expect(refused.log).not.toMatch(/ up -d /);
    expect(state('running')).toBe('bbb');
    expect(state('checkout')).toBe('bbb');
  });

  it('skips the backup entirely when WATCHGUARD_PREDEPLOY_BACKUP=false', () => {
    run('aaa');
    expect(run('bbb', { env: { WATCHGUARD_PREDEPLOY_BACKUP: 'false' } }).log).not.toMatch(/backup/);
  });

  it('recovers low disk space before fetching or building', () => {
    const result = run('aaa', { env: { FAKE_FREE_KB: '100', FAKE_PRUNE_RECOVERS: '1' } });
    expect(result.status).toBe(0);
    expect(result.log.indexOf('builder prune -af --filter until=168h')).toBeLessThan(result.log.indexOf('git fetch'));
    expect(state('running')).toBe('aaa');
  });

  it.each([
    { FAKE_FREE_KB: '100' }, { FAKE_FREE_INODES: '0' },
    { FAKE_DOCKER_LOW: '1' }, { FAKE_CONTAINERD_LOW: '1' },
  ])('refuses unsafe storage without touching running images or data: %j', env => {
    run('aaa');
    const images = state('images');
    const result = run('bbb', { env });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/Storage preflight failed/);
    expect(result.log).not.toMatch(/git (fetch|reset)|compose|image (rm|prune)|volume/);
    expect(state('running')).toBe('aaa');
    expect(state('images')).toBe(images);
    expect(existsSync(path.join(dir, 'app', '.failed-commit'))).toBe(false);
    expect(run('bbb').status).toBe(0); // Recovered capacity can retry the same commit.
  });

  it('checks storage even when the current release is already healthy', () => {
    run('aaa');
    const result = run('aaa', { env: { FAKE_FREE_KB: '10' } });
    expect(result.status).not.toBe(0);
    expect(result.log).not.toMatch(/compose/);
    expect(state('running')).toBe('aaa');
  });

  it.each([{ FAKE_DF_FAIL: '1' }, { FAKE_FREE_KB: 'unknown' }, { WATCHGUARD_MIN_FREE_KB: '-1' }])('fails closed on invalid measurements/settings: %j', env => {
    const result = run('aaa', { env });
    expect(result.status).not.toBe(0);
    expect(result.log).not.toMatch(/builder prune|git fetch|compose/);
  });

  it('supports explicit capacity thresholds and refuses a missing custom store', () => {
    expect(run('aaa', { env: { WATCHGUARD_MIN_FREE_KB: '50', WATCHGUARD_MIN_FREE_INODES: '10', FAKE_FREE_KB: '100', FAKE_FREE_INODES: '20' } }).status).toBe(0);
    const result = run('bbb', { env: { WATCHGUARD_CONTAINERD_DIR: slash(path.join(dir, 'missing')) } });
    expect(result.status).not.toBe(0);
    expect(result.log).not.toMatch(/builder prune|git fetch|compose/);
  });
});

describe('updater script', () => {
  it('stops on any error and never runs twice at once', () => {
    expect(source).toMatch(/^set -Eeuo pipefail$/m);
    expect(source).toMatch(/flock -n 9 \|\| exit 0/);
  });

  it('uses LF line endings, or bash on the host will not run it', () => {
    expect(source.includes('\r')).toBe(false);
  });
});
