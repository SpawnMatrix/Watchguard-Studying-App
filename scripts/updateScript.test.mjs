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
  builder) exit 0 ;;
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
      ...env,
    },
  });
  return { status: result.status, stderr: result.stderr, log: log() };
}

describe.skipIf(!bash)('updater behaviour', () => {
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'wg-update-'));
    for (const d of ['bin', 'state', 'app/deploy/docker']) mkdirSync(path.join(dir, d), { recursive: true });
    writeFileSync(path.join(dir, 'bin', 'docker'), FAKE_DOCKER, { mode: 0o755 });
    writeFileSync(path.join(dir, 'bin', 'git'), FAKE_GIT, { mode: 0o755 });
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
