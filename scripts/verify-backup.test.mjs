import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyBackup, REQUIRED_TABLES } from './verify-backup.mjs';

/**
 * The point of these is the third case. A backup that is valid SQLite with every table present and
 * no rows in it looks like a success to any check that stops at "did the file open", and retention
 * then prunes the good history behind it.
 */
describe('backup verification', () => {
  let dir;
  const build = (name, { accounts = 0, tables = REQUIRED_TABLES } = {}) => {
    const file = path.join(dir, name);
    const db = new DatabaseSync(file);
    for (const table of tables) db.exec(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY)`);
    if (tables.includes('accounts')) {
      for (let i = 0; i < accounts; i++) db.prepare('INSERT INTO accounts (id) VALUES (?)').run(i + 1);
    }
    db.close();
    return file;
  };

  beforeAll(() => { dir = mkdtempSync(path.join(tmpdir(), 'wg-backup-')); });
  afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

  it('passes a populated backup that has every table the app creates', () => {
    const result = verifyBackup(build('good.sqlite', { accounts: 3 }), { minAccounts: 1 });
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.accounts).toBe(3);
  });

  it('fails a structurally perfect but empty backup when accounts are expected', () => {
    const result = verifyBackup(build('empty.sqlite', { accounts: 0 }), { minAccounts: 1 });
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/at least 1 account/);
  });

  it('still reports row counts when it fails, so the operator can see what it found', () => {
    const result = verifyBackup(build('empty2.sqlite'), { minAccounts: 1 });
    expect(result.stats.accounts).toBe(0);
    expect(Object.keys(result.stats).sort()).toEqual([...REQUIRED_TABLES].sort());
  });

  it('fails a backup missing tables the app needs to start', () => {
    const partial = REQUIRED_TABLES.filter(t => t !== 'sessions' && t !== 'settings');
    const result = verifyBackup(build('partial.sqlite', { accounts: 1, tables: partial }), { minAccounts: 1 });
    expect(result.ok).toBe(false);
    expect(result.problems.join(' ')).toMatch(/Missing tables.*sessions.*settings/);
  });

  it('fails a file that is not a database at all', () => {
    const file = path.join(dir, 'corrupt.sqlite');
    writeFileSync(file, 'this is not a database');
    expect(verifyBackup(file).ok).toBe(false);
  });

  it('fails an empty file and a missing file distinctly', () => {
    const file = path.join(dir, 'zero.sqlite');
    writeFileSync(file, '');
    expect(verifyBackup(file).problems).toEqual(['Backup file is empty.']);
    expect(verifyBackup(path.join(dir, 'absent.sqlite')).problems).toEqual(['Backup file does not exist.']);
  });

  it('defaults to not requiring accounts, so a brand-new deployment can still back up', () => {
    expect(verifyBackup(build('fresh.sqlite', { accounts: 0 })).ok).toBe(true);
  });
});
