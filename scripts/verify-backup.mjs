// Usage: node scripts/verify-backup.mjs <backup.sqlite> [--min-accounts N]
//
// A backup nobody has opened is a hope, not a backup. This checks the three ways a study-portal
// backup can be useless while still looking fine on disk: it is not valid SQLite, it is valid but
// missing tables the app needs to start, or it is structurally perfect and empty because it was
// taken against a fresh or reset database.
//
// That last case is the dangerous one. Retention prunes older copies once a new backup succeeds, so
// an empty backup that counts as a success is how a good history gets deleted. --min-accounts makes
// the caller state what it expects to find.
import { DatabaseSync } from 'node:sqlite';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

/** Tables the application creates on startup. A backup without them cannot restore a working app. */
export const REQUIRED_TABLES = [
  'accounts', 'admin_sessions', 'auth_failures',
  'progress', 'progress_backups', 'sessions', 'settings',
];

export function verifyBackup(file, { minAccounts = 0 } = {}) {
  const problems = [];
  const stats = {};
  if (!existsSync(file)) return { ok: false, problems: ['Backup file does not exist.'], stats };
  if (statSync(file).size === 0) return { ok: false, problems: ['Backup file is empty.'], stats };

  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
  } catch (error) {
    return { ok: false, problems: [`Not a readable SQLite database: ${error.message}`], stats };
  }

  try {
    const integrity = db.prepare('PRAGMA integrity_check').get()?.integrity_check;
    if (integrity !== 'ok') problems.push(`Integrity check reported: ${integrity ?? 'no result'}`);

    const present = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
    const missing = REQUIRED_TABLES.filter(table => !present.has(table));
    if (missing.length) problems.push(`Missing tables: ${missing.join(', ')}`);

    for (const table of REQUIRED_TABLES) {
      if (present.has(table)) stats[table] = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
    }

    // Structurally sound but empty: a real risk when DATA_DIR points somewhere unexpected.
    if (stats.accounts !== undefined && stats.accounts < minAccounts) {
      problems.push(`Expected at least ${minAccounts} account(s), found ${stats.accounts}. Refusing to treat this as a good backup.`);
    }
  } catch (error) {
    problems.push(`Could not read the backup: ${error.message}`);
  } finally {
    db.close();
  }

  return { ok: problems.length === 0, problems, stats };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'verify-backup.mjs'));
if (invokedDirectly) {
  const file = process.argv[2];
  const flagIndex = process.argv.indexOf('--min-accounts');
  const minAccounts = flagIndex > -1 ? Number.parseInt(process.argv[flagIndex + 1] ?? '0', 10) : 0;
  if (!file) {
    console.error('Usage: node scripts/verify-backup.mjs <backup.sqlite> [--min-accounts N]');
    process.exitCode = 2;
  } else if (!Number.isFinite(minAccounts) || minAccounts < 0) {
    console.error('--min-accounts takes a non-negative whole number.');
    process.exitCode = 2;
  } else {
    const { ok, problems, stats } = verifyBackup(file, { minAccounts });
    const summary = Object.entries(stats).map(([table, count]) => `${table}=${count}`).join(' ');
    if (ok) {
      console.log(`Backup verified: ${path.basename(file)} (${summary})`);
    } else {
      console.error(`Backup FAILED verification: ${path.basename(file)}`);
      for (const problem of problems) console.error(`  - ${problem}`);
      if (summary) console.error(`  rows: ${summary}`);
      process.exitCode = 1;
    }
  }
}
