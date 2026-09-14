import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The backup script runs on the Docker host, where nothing in CI executes it. These checks pin the
 * properties that make it safe, so an edit that quietly breaks one fails here instead of on the
 * night a restore is needed.
 */
const script = readFileSync(path.join(__dirname, '../deploy/docker/backup-watchguard.sh'), 'utf8');
const timer = readFileSync(path.join(__dirname, '../deploy/docker/watchguard-backup.timer'), 'utf8');
const service = readFileSync(path.join(__dirname, '../deploy/docker/watchguard-backup.service'), 'utf8');

describe('backup script safety', () => {
  it('stops on any error and never runs twice at once', () => {
    expect(script).toMatch(/^set -Eeuo pipefail$/m);
    expect(script).toMatch(/flock -n 9 \|\| exit 0/);
  });

  it('verifies the new backup before pruning anything', () => {
    const verify = script.indexOf('verify-backup.mjs /verify/study.sqlite');
    const prune = script.indexOf('rm -f -- "${old}"');
    expect(verify).toBeGreaterThan(0);
    expect(prune).toBeGreaterThan(verify);
    // A failed verification must leave the file for inspection and exit before the pruning block.
    const failure = script.slice(verify, prune);
    expect(failure).toMatch(/mv "\$\{target\}" "\$\{target\}\.rejected"\s+exit 1/);
  });

  it('requires accounts in the backup, so an empty database never counts as a good one', () => {
    expect(script).toMatch(/MIN_ACCOUNTS="\$\{WATCHGUARD_BACKUP_MIN_ACCOUNTS:-1\}"/);
    expect(script).toMatch(/--min-accounts "\$\{MIN_ACCOUNTS\}"/);
  });

  it('keeps a floor of backups regardless of age', () => {
    expect(script).toMatch(/KEEP_MIN="\$\{WATCHGUARD_BACKUP_KEEP_MIN:-7\}"/);
    expect(script).toMatch(/if \(\( total > KEEP_MIN \)\); then/);
  });

  it('needs no Node.js on the host: verification runs in the portal image, isolated', () => {
    expect(script).not.toMatch(/^\s*node /m);
    expect(script).toMatch(/docker run --rm --network none --read-only/);
    expect(script).toMatch(/-v "\$\{target\}:\/verify\/study\.sqlite:ro"/);
    // The verifier only runs its CLI when invoked as scripts/verify-backup.mjs.
    expect(script).toMatch(/:\/verify\/scripts\/verify-backup\.mjs:ro"/);
  });

  it('keeps backup files private to root', () => {
    expect(script).toMatch(/install -d -m 700 "\$\{BACKUP_DIR\}"/);
    expect(script).toMatch(/chmod 600 "\$\{target\}"/);
  });

  it('uses LF line endings, or bash on the host will not run it', () => {
    expect(script.includes('\r')).toBe(false);
  });
});

describe('backup schedule', () => {
  it('runs daily, catches up after downtime, and calls the installed script', () => {
    expect(timer).toMatch(/OnCalendar=\*-\*-\* 03:20:00/);
    expect(timer).toMatch(/Persistent=true/);
    expect(service).toMatch(/ExecStart=\/usr\/local\/sbin\/backup-watchguard/);
    expect(service).toMatch(/Requires=docker\.service/);
  });
});
