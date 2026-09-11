import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { validateSnapshot, type StudySnapshot } from '../src/account/schema';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const normalizeUsername = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export class AccountError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

/* ------------------------------------------------------------------ *
 * Versioned key derivation
 *
 * Every stored secret records the scheme that produced it. Verification
 * follows the recorded scheme; a successful verification against an
 * outdated scheme transparently re-hashes to the current one. Without
 * this the work factor can never be raised without invalidating every
 * existing credential.
 * ------------------------------------------------------------------ */

export const CURRENT_KDF = 'scrypt$N=32768,r=8,p=1,len=64';
const LEGACY_DIGEST_KDF = 'sha256';

interface ScryptSpec { kind: 'scrypt'; N: number; r: number; p: number; len: number }
type KdfSpec = ScryptSpec | { kind: 'sha256' };

function parseKdf(spec: string): KdfSpec {
  if (spec === LEGACY_DIGEST_KDF) return { kind: 'sha256' };
  const match = /^scrypt\$N=(\d+),r=(\d+),p=(\d+),len=(\d+)$/.exec(spec);
  if (!match) throw new Error(`Unsupported key derivation scheme: ${spec}`);
  const [N, r, p, len] = match.slice(1).map(Number);
  // Guard against a tampered database row asking for an allocation that
  // would take the process down.
  if (N > 2 ** 20 || r > 32 || p > 16 || len > 128) throw new Error('Key derivation parameters out of range');
  return { kind: 'scrypt', N, r, p, len };
}

const scryptAsync = (secret: string, salt: string, spec: ScryptSpec) => new Promise<string>((resolve, reject) =>
  scrypt(secret, salt, spec.len, { N: spec.N, r: spec.r, p: spec.p, maxmem: Math.max(64 * 1024 * 1024, 256 * spec.N * spec.r) },
    (err, key) => err ? reject(err) : resolve(key.toString('hex'))));

/** Derives `secret` under `spec`; defaults to the current scheme. */
export async function deriveSecret(secret: string, salt: string, spec: string = CURRENT_KDF): Promise<string> {
  const parsed = parseKdf(spec);
  return parsed.kind === 'sha256' ? digest(secret) : scryptAsync(secret, salt, parsed);
}

/* ------------------------------------------------------------------ *
 * PIN strength
 *
 * A six-digit PIN has a 10^6 key space, but real choices cluster hard.
 * Blocking the predictable shapes removes the guesses a sprayer tries
 * first, which is where the practical risk lives.
 * ------------------------------------------------------------------ */

const LISTED_WEAK_PINS = new Set([
  '123456', '654321', '123123', '121212', '112233', '123321', '456456', '789789',
  '696969', '159753', '147258', '159357', '142536', '246810', '135790', '102030',
  '011235', '012345', '098765', '567890', '212121', '313131', '123654', '321654',
]);

export function isWeakPin(pin: string): boolean {
  if (LISTED_WEAK_PINS.has(pin)) return true;
  if (/^(\d)\1{5}$/.test(pin)) return true;            // 000000, 777777
  if (/^(\d{2})\1{2}$/.test(pin)) return true;         // ababab
  if (/^(\d{3})\1$/.test(pin)) return true;            // abcabc
  // Straight runs in either direction, including wraparound (890123).
  const ascending = [...pin].every((d, i) => i === 0 || (+d - +pin[i - 1] + 10) % 10 === 1);
  const descending = [...pin].every((d, i) => i === 0 || (+pin[i - 1] - +d + 10) % 10 === 1);
  if (ascending || descending) return true;
  // A birth year in either half is the single most common real-world pattern.
  const head = Number(pin.slice(0, 4)), tail = Number(pin.slice(2));
  if ((head >= 1930 && head <= 2035) || (tail >= 1930 && tail <= 2035)) return true;
  return false;
}

/* ------------------------------------------------------------------ *
 * Throttling
 *
 * Three independent buckets, all persisted so a restart does not reset
 * an attack in progress:
 *
 *   user   — vertical guessing against one account
 *   ip     — spraying one PIN across many accounts from one source
 *   global — the same spread across many sources
 *
 * The global bucket is deliberately generous; it is a last-resort floor
 * that should only engage during a real attack, not during a class of
 * technicians signing in at the start of a shift.
 * ------------------------------------------------------------------ */

const WINDOW_MS = 15 * 60_000;
export const THROTTLE = {
  user: { limit: 5, windowMs: WINDOW_MS },
  ip: { limit: 15, windowMs: WINDOW_MS },
  global: { limit: 200, windowMs: WINDOW_MS },
} as const;

export interface SavedProgress { revision: number; snapshot: StudySnapshot; updatedAt: number }
export interface Identity { id: number; username: string; isAdmin: boolean }
type UserRow = {
  id: number; username: string; salt: string; pin_hash: string; kdf: string;
  recovery_hash: string; recovery_salt: string; recovery_kdf: string; is_admin: number;
};

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60_000;
const SESSION_IDLE_MS = 7 * 24 * 60 * 60_000;
const SESSIONS_PER_ACCOUNT = 10;
const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60_000;
const ADMIN_SESSION_IDLE_MS = 30 * 60_000;

export class AccountStore {
  readonly db: DatabaseSync;

  constructor(filename: string) {
    if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL, pin_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
      CREATE TABLE IF NOT EXISTS progress (account_id INTEGER PRIMARY KEY REFERENCES accounts(id), revision INTEGER NOT NULL,
        snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS progress_backups (account_id INTEGER NOT NULL REFERENCES accounts(id), revision INTEGER NOT NULL,
        snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(account_id,revision));
      CREATE TABLE IF NOT EXISTS auth_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL, window_start INTEGER NOT NULL);`);
    this.migrate();
  }

  /**
   * Additive migrations only. Existing deployments carry live study
   * progress, so no step rewrites or drops user data; new columns take
   * defaults that describe how the existing rows were actually written.
   */
  private migrate() {
    const columns = (table: string) => new Set((this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name));
    const accounts = columns('accounts');
    // Rows written before versioning used exactly the current scrypt
    // parameters, so they need no rehash — only an accurate label.
    if (!accounts.has('kdf')) this.db.exec(`ALTER TABLE accounts ADD COLUMN kdf TEXT NOT NULL DEFAULT '${CURRENT_KDF}'`);
    // Recovery codes were unsalted SHA-256. 144 bits of entropy makes that
    // safe in practice, but it is upgraded on next use for consistency.
    if (!accounts.has('recovery_kdf')) this.db.exec(`ALTER TABLE accounts ADD COLUMN recovery_kdf TEXT NOT NULL DEFAULT '${LEGACY_DIGEST_KDF}'`);
    if (!accounts.has('recovery_salt')) this.db.exec(`ALTER TABLE accounts ADD COLUMN recovery_salt TEXT NOT NULL DEFAULT ''`);
    if (!accounts.has('is_admin')) this.db.exec('ALTER TABLE accounts ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');

    const sessions = columns('sessions');
    if (!sessions.has('created_at')) this.db.exec('ALTER TABLE sessions ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0');
    if (!sessions.has('last_seen')) this.db.exec('ALTER TABLE sessions ADD COLUMN last_seen INTEGER NOT NULL DEFAULT 0');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_failures (scope TEXT NOT NULL, key TEXT NOT NULL,
        failures INTEGER NOT NULL, window_start INTEGER NOT NULL, PRIMARY KEY(scope,key));
      CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER,
        created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
      PRAGMA user_version=2;`);
  }

  close() { this.db.close(); }

  /* ---------------- credential validation ---------------- */

  private credentials(username: unknown, pin: unknown) {
    const name = normalizeUsername(username);
    if (!/^[a-z0-9_]{3,24}$/.test(name)) throw new AccountError(400, 'Use 3–24 letters, numbers, or underscores for your username.');
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) throw new AccountError(400, 'Use a six-digit PIN.');
    return { name, pin };
  }

  /** Strength is enforced when a PIN is *set*, never when one is checked. */
  private assertStrongPin(pin: string) {
    if (isWeakPin(pin)) {
      throw new AccountError(400, 'That PIN is too easy to guess. Avoid repeats, runs like 123456, and years.');
    }
  }

  /* ---------------- throttling ---------------- */

  private buckets(name: string, ip?: string): [string, string, { limit: number; windowMs: number }][] {
    const list: [string, string, { limit: number; windowMs: number }][] = [['user', name, THROTTLE.user]];
    if (ip) list.push(['ip', ip, THROTTLE.ip]);
    list.push(['global', 'all', THROTTLE.global]);
    return list;
  }

  private throttle(name: string, ip?: string) {
    const now = Date.now();
    const buckets = this.buckets(name, ip);
    for (const [scope, , config] of buckets) {
      this.db.prepare('DELETE FROM auth_failures WHERE scope=? AND window_start < ?').run(scope, now - config.windowMs);
    }
    for (const [scope, key, config] of buckets) {
      const row = this.db.prepare('SELECT failures FROM auth_failures WHERE scope=? AND key=?').get(scope, key) as { failures: number } | undefined;
      if (row && row.failures >= config.limit) {
        throw new AccountError(429, scope === 'user'
          ? 'Too many attempts. Try again in 15 minutes.'
          : 'Too many sign-in attempts from this network. Try again in 15 minutes.');
      }
    }
    // Counted before the asynchronous hash so concurrent requests cannot
    // all slip past the check while the first one is still deriving.
    for (const [scope, key] of buckets) {
      this.db.prepare('INSERT INTO auth_failures VALUES (?,?,1,?) ON CONFLICT(scope,key) DO UPDATE SET failures=failures+1').run(scope, key, now);
    }
  }

  /**
   * Relieves the buckets a legitimate sign-in should clear.
   *
   * The global floor is only decremented, never reset: a successful sign-in
   * should not hand an attacker a way to zero it, but successes must not
   * accumulate toward it either, or a busy shift change would lock out the
   * whole portal.
   */
  private clearThrottle(name: string, ip?: string) {
    this.db.prepare('DELETE FROM auth_failures WHERE scope=? AND key=?').run('user', name);
    if (ip) this.db.prepare('DELETE FROM auth_failures WHERE scope=? AND key=?').run('ip', ip);
    this.db.prepare("UPDATE auth_failures SET failures=MAX(failures-1,0) WHERE scope='global'").run();
    this.db.prepare('DELETE FROM auth_attempts WHERE username=?').run(name);
  }

  /* ---------------- sessions ---------------- */

  private session(user: Pick<UserRow, 'id' | 'username'> & { is_admin?: number }) {
    const now = Date.now();
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?').run(now, now - SESSION_IDLE_MS);
    this.db.prepare('INSERT INTO sessions (token_hash,account_id,expires_at,created_at,last_seen) VALUES (?,?,?,?,?)')
      .run(digest(token), user.id, now + SESSION_MAX_AGE_MS, now, now);
    // Bound concurrent sessions per account so a stolen-token backlog cannot
    // accumulate indefinitely; the oldest are retired first.
    this.db.prepare(`DELETE FROM sessions WHERE account_id=? AND token_hash NOT IN
      (SELECT token_hash FROM sessions WHERE account_id=? ORDER BY last_seen DESC LIMIT ?)`)
      .run(user.id, user.id, SESSIONS_PER_ACCOUNT);
    return { token, username: user.username, accountId: user.id, isAdmin: !!user.is_admin, ...this.progress(user.id) };
  }

  identify(token: string | undefined): Identity | undefined {
    if (!token || token.length > 100) return undefined;
    const now = Date.now();
    const row = this.db.prepare(`SELECT accounts.id, accounts.username, accounts.is_admin, sessions.last_seen
      FROM sessions JOIN accounts ON accounts.id=sessions.account_id
      WHERE sessions.token_hash=? AND sessions.expires_at>?`).get(digest(token), now) as
      { id: number; username: string; is_admin: number; last_seen: number } | undefined;
    if (!row) return undefined;
    if (row.last_seen && now - row.last_seen > SESSION_IDLE_MS) {
      this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));
      return undefined;
    }
    // Rolling idle window: activity keeps a session alive up to the absolute cap.
    this.db.prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?').run(now, digest(token));
    return { id: row.id, username: row.username, isAdmin: !!row.is_admin };
  }

  logout(token: string) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token)); }

  /** Signs every device out of an account. */
  logoutEverywhere(accountId: number) {
    this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(accountId);
    this.db.prepare('DELETE FROM admin_sessions WHERE account_id=?').run(accountId);
  }

  sessionCount(accountId: number): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE account_id=?').get(accountId) as { n: number }).n;
  }

  /* ---------------- registration and sign-in ---------------- */

  async register(username: unknown, pin: unknown, ip?: string) {
    const c = this.credentials(username, pin);
    this.assertStrongPin(c.pin);
    // Registration is throttled too: without it the 409/401 split is an
    // unlimited oracle for which usernames exist.
    this.throttle(c.name, ip);
    const salt = randomBytes(24).toString('hex');
    const recoverySalt = randomBytes(24).toString('hex');
    const pinHash = await deriveSecret(c.pin, salt);
    const recoveryCode = randomBytes(18).toString('base64url');
    const recoveryHash = await deriveSecret(recoveryCode, recoverySalt);
    // The bootstrap account is the only way to obtain the first admin on a
    // fresh database; every later grant goes through an existing admin.
    const bootstrap = normalizeUsername(process.env.ADMIN_BOOTSTRAP_USER);
    const isAdmin = bootstrap !== '' && bootstrap === c.name ? 1 : 0;
    let id: number;
    try {
      const row = this.db.prepare(`INSERT INTO accounts
        (username,salt,pin_hash,kdf,recovery_hash,recovery_salt,recovery_kdf,is_admin,created_at)
        VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(c.name, salt, pinHash, CURRENT_KDF, recoveryHash, recoverySalt, CURRENT_KDF, isAdmin, Date.now());
      id = Number(row.lastInsertRowid);
    } catch (err) {
      if (this.db.prepare('SELECT id FROM accounts WHERE username=?').get(c.name)) {
        throw new AccountError(409, 'That username is taken. Sign in or choose another.');
      }
      throw err;
    }
    this.clearThrottle(c.name, ip);
    return { ...this.session({ id, username: c.name, is_admin: isAdmin }), recoveryCode };
  }

  async login(username: unknown, pin: unknown, ip?: string) {
    const c = this.credentials(username, pin);
    this.throttle(c.name, ip);
    const user = this.db.prepare('SELECT * FROM accounts WHERE username=?').get(c.name) as UserRow | undefined;
    // Unknown accounts still pay the full derivation cost so response time
    // does not distinguish "no such user" from "wrong PIN".
    const spec = user?.kdf ?? CURRENT_KDF;
    const hash = await deriveSecret(c.pin, user?.salt ?? 'unknown-account-dummy-salt', spec);
    if (!user || !same(hash, user.pin_hash)) throw new AccountError(401, 'Username or PIN did not match.');
    // A recovery completed while this request was hashing must invalidate
    // the credential read taken before it.
    const current = this.db.prepare('SELECT pin_hash FROM accounts WHERE id=?').get(user.id) as { pin_hash: string };
    if (current.pin_hash !== user.pin_hash) throw new AccountError(401, 'Sign in again with your current PIN.');
    this.clearThrottle(c.name, ip);
    if (user.kdf !== CURRENT_KDF) await this.upgradePinHash(user.id, c.pin, user.pin_hash);
    return this.session(user);
  }

  /** Re-derives a verified PIN under the current scheme. Guarded on the old
   *  hash so a concurrent recovery is never overwritten. */
  private async upgradePinHash(id: number, pin: string, previousHash: string) {
    const salt = randomBytes(24).toString('hex');
    const hash = await deriveSecret(pin, salt);
    this.db.prepare('UPDATE accounts SET salt=?, pin_hash=?, kdf=? WHERE id=? AND pin_hash=?')
      .run(salt, hash, CURRENT_KDF, id, previousHash);
  }

  async recover(username: unknown, code: unknown, pin: unknown, ip?: string) {
    const c = this.credentials(username, pin);
    this.assertStrongPin(c.pin);
    this.throttle(c.name, ip);
    const user = this.db.prepare('SELECT * FROM accounts WHERE username=?').get(c.name) as UserRow | undefined;
    const trimmed = typeof code === 'string' ? code.trim() : '';
    const attempted = typeof code === 'string' && code.length <= 100 && user
      ? await deriveSecret(trimmed, user.recovery_salt ?? '', user.recovery_kdf || LEGACY_DIGEST_KDF)
      : '';
    if (!user || !attempted || !same(attempted, user.recovery_hash)) {
      throw new AccountError(401, 'Username or recovery code did not match.');
    }
    const salt = randomBytes(24).toString('hex');
    const recoverySalt = randomBytes(24).toString('hex');
    const pinHash = await deriveSecret(c.pin, salt);
    const recoveryCode = randomBytes(18).toString('base64url');
    const recoveryHash = await deriveSecret(recoveryCode, recoverySalt);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare(`UPDATE accounts SET salt=?,pin_hash=?,kdf=?,recovery_hash=?,recovery_salt=?,recovery_kdf=?
        WHERE id=? AND recovery_hash=?`)
        .run(salt, pinHash, CURRENT_KDF, recoveryHash, recoverySalt, CURRENT_KDF, user.id, user.recovery_hash);
      if (!result.changes) throw new AccountError(401, 'That recovery code has already been used.');
      this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(user.id);
      this.db.prepare('DELETE FROM admin_sessions WHERE account_id=?').run(user.id);
      this.db.exec('COMMIT');
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
    this.clearThrottle(c.name, ip);
    return { ...this.session(user), recoveryCode };
  }

  /* ---------------- administration ---------------- */

  adminCount(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM accounts WHERE is_admin=1').get() as { n: number }).n;
  }

  setAdmin(username: unknown, isAdmin: boolean): Identity {
    const name = normalizeUsername(username);
    const user = this.db.prepare('SELECT id,username,is_admin FROM accounts WHERE username=?').get(name) as
      { id: number; username: string; is_admin: number } | undefined;
    if (!user) throw new AccountError(404, 'No account with that username.');
    if (!isAdmin && user.is_admin && this.adminCount() <= 1) {
      throw new AccountError(409, 'This is the only administrator. Promote someone else first.');
    }
    this.db.prepare('UPDATE accounts SET is_admin=? WHERE id=?').run(isAdmin ? 1 : 0, user.id);
    // Revoking admin must drop any admin session that account already holds.
    if (!isAdmin) this.db.prepare('DELETE FROM admin_sessions WHERE account_id=?').run(user.id);
    return { id: user.id, username: user.username, isAdmin };
  }

  listAccounts() {
    return this.db.prepare(`SELECT accounts.id, accounts.username, accounts.is_admin, accounts.created_at,
        progress.revision, progress.updated_at
      FROM accounts LEFT JOIN progress ON progress.account_id=accounts.id
      ORDER BY accounts.created_at ASC`).all() as {
        id: number; username: string; is_admin: number; created_at: number;
        revision: number | null; updated_at: number | null;
      }[];
  }

  /** Admin authority is a separate, short-lived credential from the study
   *  session, so an idle console cannot be used hours later. */
  createAdminSession(accountId: number | null) {
    const now = Date.now();
    const token = randomBytes(32).toString('base64url');
    this.db.prepare('DELETE FROM admin_sessions WHERE expires_at < ? OR last_seen < ?').run(now, now - ADMIN_SESSION_IDLE_MS);
    this.db.prepare('INSERT INTO admin_sessions VALUES (?,?,?,?,?)')
      .run(digest(token), accountId, now, now, now + ADMIN_SESSION_MAX_AGE_MS);
    return token;
  }

  identifyAdmin(token: string | undefined): { accountId: number | null; username: string | null } | undefined {
    if (!token || token.length > 100) return undefined;
    const now = Date.now();
    const row = this.db.prepare('SELECT account_id,last_seen FROM admin_sessions WHERE token_hash=? AND expires_at>?')
      .get(digest(token), now) as { account_id: number | null; last_seen: number } | undefined;
    if (!row) return undefined;
    if (now - row.last_seen > ADMIN_SESSION_IDLE_MS) {
      this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(digest(token));
      return undefined;
    }
    // An account demoted since the session was issued loses it immediately.
    if (row.account_id !== null) {
      const account = this.db.prepare('SELECT username,is_admin FROM accounts WHERE id=?').get(row.account_id) as
        { username: string; is_admin: number } | undefined;
      if (!account || !account.is_admin) {
        this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(digest(token));
        return undefined;
      }
      this.db.prepare('UPDATE admin_sessions SET last_seen=? WHERE token_hash=?').run(now, digest(token));
      return { accountId: row.account_id, username: account.username };
    }
    this.db.prepare('UPDATE admin_sessions SET last_seen=? WHERE token_hash=?').run(now, digest(token));
    return { accountId: null, username: null };
  }

  endAdminSession(token: string) { this.db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').run(digest(token)); }

  /* ---------------- durable settings ---------------- */

  getSetting(key: string): string | undefined {
    return (this.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as { value: string } | undefined)?.value;
  }

  setSetting(key: string, value: string) {
    this.db.prepare('INSERT INTO settings VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
      .run(key, value, Date.now());
  }

  /* ---------------- study progress ---------------- */

  progress(id: number): SavedProgress {
    const row = this.db.prepare('SELECT revision,snapshot,updated_at FROM progress WHERE account_id=?').get(id) as
      { revision: number; snapshot: string; updated_at: number } | undefined;
    return row ? { revision: row.revision, snapshot: JSON.parse(row.snapshot), updatedAt: row.updated_at } : { revision: 0, snapshot: {}, updatedAt: 0 };
  }

  save(id: number, revision: unknown, data: unknown): SavedProgress {
    if (!Number.isSafeInteger(revision) || Number(revision) < 0) throw new AccountError(400, 'Invalid progress revision.');
    let snapshot: StudySnapshot;
    try { snapshot = validateSnapshot(data); } catch { throw new AccountError(400, 'Invalid study progress.'); }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.progress(id);
      if (previous.revision !== revision) throw new AccountError(409, 'Newer progress was saved on another device.');
      if (previous.revision) this.db.prepare('INSERT OR REPLACE INTO progress_backups VALUES (?,?,?,?)').run(id, previous.revision, JSON.stringify(previous.snapshot), previous.updatedAt);
      const next = { revision: previous.revision + 1, snapshot, updatedAt: Date.now() };
      this.db.prepare(`INSERT INTO progress VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,updated_at=excluded.updated_at`).run(id, next.revision, JSON.stringify(snapshot), next.updatedAt);
      // Keep the most recent 20 revisions for recovery without unbounded database growth.
      this.db.prepare('DELETE FROM progress_backups WHERE account_id=? AND revision<?').run(id, next.revision - 20);
      this.db.exec('COMMIT'); return next;
    } catch (err) { this.db.exec('ROLLBACK'); throw err; }
  }
}
