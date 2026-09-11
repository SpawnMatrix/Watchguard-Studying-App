import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomBytes, scrypt } from 'node:crypto';
import express from 'express';
import type { Server } from 'node:http';
import { AccountStore, isWeakPin, deriveSecret, CURRENT_KDF } from './accounts';
import { accountRoutes } from './accountRoutes';
import { adminRoutes, requireAdmin } from './adminRoutes';
import { proxyTrustSetting, cookiesAreSecure } from './security';

const stores: AccountStore[] = []; const directories: string[] = []; const servers: Server[] = [];
const open = (filename = ':memory:') => { const s = new AccountStore(filename); stores.push(s); return s; };

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); })));
  for (const s of stores.splice(0)) { try { s.close(); } catch { } }
  for (const d of directories.splice(0)) rmSync(d, { recursive: true, force: true });
  delete process.env.TRUSTED_PROXY_HOPS;
  delete process.env.TRUSTED_PROXY_CIDR;
  delete process.env.COOKIE_SECURE;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_BOOTSTRAP_USER;
});

describe('PIN strength', () => {
  it('rejects the shapes a sprayer tries first', () => {
    for (const weak of ['000000', '111111', '123456', '654321', '121212', '123123', '012345', '890123', '198501', '202401', '199012'])
      expect(isWeakPin(weak), weak).toBe(true);
  });
  it('accepts ordinary PINs', () => {
    for (const ok of ['482951', '739162', '305729', '846130', '271840'])
      expect(isWeakPin(ok), ok).toBe(false);
  });
  it('enforces strength when a PIN is set but never when one is checked', async () => {
    const s = open();
    await expect(s.register('pilot', '123456')).rejects.toMatchObject({ status: 400 });
    const a = await s.register('pilot', '482951');
    // A weak guess must fail as a normal wrong PIN, otherwise the error
    // itself tells an attacker which guesses are worth making.
    await expect(s.login('pilot', '000000')).rejects.toMatchObject({ status: 401 });
    await expect(s.recover('pilot', a.recoveryCode, '111111')).rejects.toMatchObject({ status: 400 });
  });
});

describe('throttling', () => {
  it('bounds guessing against a single account, including parallel attempts', async () => {
    const s = open();
    await s.register('pilot', '482951');
    const attempts = await Promise.allSettled(Array.from({ length: 7 }, () => s.login('pilot', '000000')));
    expect(attempts.filter(r => r.status === 'rejected' && (r as any).reason.status === 429)).toHaveLength(2);
    await expect(s.login('pilot', '482951')).rejects.toMatchObject({ status: 429 });
  });

  it('stops one source spraying a single PIN across many accounts', async () => {
    const s = open();
    for (let i = 0; i < 20; i++) await s.register(`tech_${i}`, '482951', `10.0.0.${i}`);
    let blocked = 0;
    for (let i = 0; i < 20; i++) {
      try { await s.login(`tech_${i}`, '000000', '203.0.113.9'); }
      catch (err: any) { if (err.status === 429) blocked++; }
    }
    // The per-username counter alone never fires here: one guess per account.
    expect(blocked).toBeGreaterThan(0);
    await expect(s.login('tech_0', '000000', '198.51.100.4')).rejects.toMatchObject({ status: 401 });
  });

  it('throttles registration so the taken-username response is not a free oracle', async () => {
    const s = open();
    await s.register('taken', '482951', '203.0.113.7');
    let blocked = 0;
    for (let i = 0; i < 25; i++) {
      try { await s.register('taken', '482951', '203.0.113.7'); }
      catch (err: any) { if (err.status === 429) blocked++; }
    }
    expect(blocked).toBeGreaterThan(0);
  });

  it('a valid sign-in clears its own buckets but not the global floor', async () => {
    const s = open();
    await s.register('pilot', '482951', '203.0.113.5');
    for (let i = 0; i < 3; i++) { try { await s.login('pilot', '000000', '203.0.113.5'); } catch { } }
    await s.login('pilot', '482951', '203.0.113.5');
    expect(s.db.prepare("SELECT * FROM auth_failures WHERE scope='user'").all()).toHaveLength(0);
    expect((s.db.prepare("SELECT failures FROM auth_failures WHERE scope='global'").get() as any).failures).toBeGreaterThan(0);
  });

  it('survives a restart rather than resetting an attack in progress', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'throttle-')); directories.push(dir);
    const file = path.join(dir, 'study.sqlite');
    const first = open(file);
    await first.register('pilot', '482951');
    for (let i = 0; i < 6; i++) { try { await first.login('pilot', '000000'); } catch { } }
    first.close();
    const second = open(file);
    await expect(second.login('pilot', '482951')).rejects.toMatchObject({ status: 429 });
  });
});

describe('versioned key derivation', () => {
  it('re-hashes an outdated credential in place on a successful sign-in', async () => {
    const s = open();
    const a = await s.register('pilot', '482951');
    const outdated = 'scrypt$N=1024,r=8,p=1,len=64';
    const legacy = await deriveSecret('482951', 'legacy-salt', outdated);
    s.db.prepare('UPDATE accounts SET salt=?, pin_hash=?, kdf=? WHERE id=?').run('legacy-salt', legacy, outdated, a.accountId);
    expect((await s.login('pilot', '482951')).username).toBe('pilot');
    const row = s.db.prepare('SELECT kdf, pin_hash FROM accounts WHERE id=?').get(a.accountId) as any;
    expect(row.kdf).toBe(CURRENT_KDF);
    expect(row.pin_hash).not.toBe(legacy);
    expect((await s.login('pilot', '482951')).username).toBe('pilot');
  });

  it('refuses key derivation parameters that would exhaust memory', async () => {
    const s = open();
    const a = await s.register('pilot', '482951');
    s.db.prepare('UPDATE accounts SET kdf=? WHERE id=?').run('scrypt$N=99999999,r=99,p=1,len=64', a.accountId);
    await expect(s.login('pilot', '482951')).rejects.toThrow();
  });
});

describe('legacy database migration', () => {
  it('opens a pre-hardening database, preserves progress, and honours old credentials', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'legacy-')); directories.push(dir);
    const file = path.join(dir, 'study.sqlite');
    const digest = (v: string) => createHash('sha256').update(v).digest('hex');
    const legacyHash = (pin: string, salt: string) => new Promise<string>((res, rej) =>
      scrypt(pin, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k.toString('hex'))));

    const old = new DatabaseSync(file);
    old.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE accounts (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL, pin_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), expires_at INTEGER NOT NULL);
      CREATE TABLE progress (account_id INTEGER PRIMARY KEY REFERENCES accounts(id), revision INTEGER NOT NULL,
        snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE progress_backups (account_id INTEGER NOT NULL REFERENCES accounts(id), revision INTEGER NOT NULL,
        snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(account_id,revision));
      CREATE TABLE auth_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL, window_start INTEGER NOT NULL);
      PRAGMA user_version=1;`);
    const salt = randomBytes(24).toString('hex');
    const recoveryCode = 'legacy-recovery-code-value';
    old.prepare('INSERT INTO accounts(username,salt,pin_hash,recovery_hash,created_at) VALUES (?,?,?,?,?)')
      .run('veteran', salt, await legacyHash('482951', salt), digest(recoveryCode), Date.now());
    const snapshot = JSON.stringify({ weakness_deck: JSON.stringify({ 10007: 2 }) });
    old.prepare('INSERT INTO progress VALUES (1,4,?,?)').run(snapshot, Date.now());
    const legacyToken = randomBytes(32).toString('base64url');
    old.prepare('INSERT INTO sessions VALUES (?,1,?)').run(digest(legacyToken), Date.now() + 86400000);
    old.close();

    const store = open(file);
    expect(store.progress(1).revision).toBe(4);
    expect(store.progress(1).snapshot).toEqual({ weakness_deck: JSON.stringify({ 10007: 2 }) });
    expect(store.identify(legacyToken)?.username).toBe('veteran');
    expect((await store.login('veteran', '482951')).revision).toBe(4);

    // The unsalted SHA-256 recovery code still works, and is upgraded on use.
    expect((await store.recover('veteran', recoveryCode, '739162')).revision).toBe(4);
    const row = store.db.prepare('SELECT kdf, recovery_kdf, recovery_salt FROM accounts WHERE id=1').get() as any;
    expect(row.recovery_kdf).toBe(CURRENT_KDF);
    expect(row.recovery_salt).not.toBe('');
  });
});

describe('sessions', () => {
  it('caps concurrent sessions and drops idle ones', async () => {
    const s = open();
    const a = await s.register('pilot', '482951');
    for (let i = 0; i < 14; i++) await s.login('pilot', '482951');
    expect(s.sessionCount(a.accountId)).toBeLessThanOrEqual(10);
    const latest = await s.login('pilot', '482951');
    s.db.prepare('UPDATE sessions SET last_seen=? WHERE account_id=?').run(Date.now() - 8 * 24 * 60 * 60_000, latest.accountId);
    expect(s.identify(latest.token)).toBeUndefined();
  });

  it('signs every device out at once', async () => {
    const s = open();
    const a = await s.register('pilot', '482951');
    const b = await s.login('pilot', '482951');
    s.logoutEverywhere(a.accountId);
    expect(s.identify(a.token)).toBeUndefined();
    expect(s.identify(b.token)).toBeUndefined();
  });
});

describe('administration', () => {
  it('grants the first administrator through the bootstrap account only', async () => {
    process.env.ADMIN_BOOTSTRAP_USER = 'chief';
    const s = open();
    const ordinary = await s.register('pilot', '482951');
    expect(ordinary.isAdmin).toBe(false);
    const chief = await s.register('chief', '739162');
    expect(chief.isAdmin).toBe(true);
    expect(s.adminCount()).toBe(1);
  });

  it('refuses to remove the last administrator and revokes sessions on demotion', async () => {
    const s = open();
    const a = await s.register('pilot', '482951');
    s.setAdmin('pilot', true);
    const token = s.createAdminSession(a.accountId);
    expect(s.identifyAdmin(token)?.username).toBe('pilot');
    expect(() => s.setAdmin('pilot', false)).toThrow(/only administrator/);
    await s.register('second', '739162');
    s.setAdmin('second', true);
    s.setAdmin('pilot', false);
    expect(s.identifyAdmin(token)).toBeUndefined();
  });

  it('expires an idle administrator session well before the study session', async () => {
    const s = open();
    const token = s.createAdminSession(null);
    expect(s.identifyAdmin(token)).toEqual({ accountId: null, username: null });
    s.db.prepare('UPDATE admin_sessions SET last_seen=?').run(Date.now() - 31 * 60_000);
    expect(s.identifyAdmin(token)).toBeUndefined();
  });

  it('keeps the AI toggle across a restart', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'settings-')); directories.push(dir);
    const file = path.join(dir, 'study.sqlite');
    const first = open(file);
    first.setSetting('globalAIEnabled', 'true');
    first.close();
    expect(open(file).getSetting('globalAIEnabled')).toBe('true');
  });
});

describe('transport configuration', () => {
  it('trusts nothing unless a proxy is declared', () => {
    expect(proxyTrustSetting()).toBe(0);
    process.env.TRUSTED_PROXY_HOPS = '1';
    expect(proxyTrustSetting()).toBe(1);
    process.env.TRUSTED_PROXY_CIDR = '172.18.0.0/16';
    expect(proxyTrustSetting()).toEqual(['172.18.0.0/16']);
  });

  it('makes the cookie Secure flag explicit rather than inferred', () => {
    process.env.COOKIE_SECURE = 'true';
    expect(cookiesAreSecure()).toBe(true);
    process.env.COOKIE_SECURE = 'false';
    expect(cookiesAreSecure()).toBe(false);
  });
});

describe('administrative HTTP surface', () => {
  const build = (store: AccountStore) => {
    const app = express();
    app.use(express.json());
    app.use('/api/account', accountRoutes(store));
    app.use('/api/admin', adminRoutes(store));
    app.post('/api/admin/analyze', requireAdmin(store), (_req, res) => res.json({ ok: true }));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    return server;
  };
  const ready = (server: Server) => new Promise<string>(resolve => server.once('listening', () =>
    resolve(`http://127.0.0.1:${(server.address() as any).port}`)));
  const send = (base: string, endpoint: string, body?: any, extra: Record<string, string> = {}, method = 'POST') =>
    fetch(base + endpoint, {
      method: body === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json', 'X-Study-Request': '1', ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('refuses certification analysis without an administrator session', async () => {
    const store = open();
    const base = await ready(build(store));
    // Previously this endpoint had no authentication at all.
    expect((await send(base, '/api/admin/analyze', { sessionHistory: [] })).status).toBe(403);
    expect((await send(base, '/api/admin/users', undefined, {}, 'GET')).status).toBe(403);
    expect((await send(base, '/api/admin/users/role', { username: 'pilot', isAdmin: true })).status).toBe(403);
  });

  it('opens an administrator session from the account role, with no password in flight', async () => {
    process.env.ADMIN_BOOTSTRAP_USER = 'chief';
    const store = open();
    const base = await ready(build(store));
    const registered = await send(base, '/api/account/register', { username: 'chief', pin: '482951' });
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    expect((await registered.json()).isAdmin).toBe(true);

    const elevated = await send(base, '/api/admin/session', {}, { cookie });
    expect(elevated.status).toBe(200);
    const adminCookie = elevated.headers.get('set-cookie')!.split(';')[0];
    expect(elevated.headers.get('set-cookie')).toContain('HttpOnly');
    expect(elevated.headers.get('set-cookie')).toContain('SameSite=Strict');

    expect((await send(base, '/api/admin/analyze', { sessionHistory: [] }, { cookie: adminCookie })).status).toBe(200);
    expect((await send(base, '/api/admin/logout', {}, { cookie: adminCookie })).status).toBe(200);
    expect((await send(base, '/api/admin/analyze', { sessionHistory: [] }, { cookie: adminCookie })).status).toBe(403);
  });

  it('promotes a signed-in account once via the break-glass password', async () => {
    process.env.ADMIN_PASSWORD = 'a-properly-long-admin-secret';
    const store = open();
    const base = await ready(build(store));
    const registered = await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];

    expect((await send(base, '/api/admin/session', { password: 'wrong' }, { cookie })).status).toBe(403);
    const elevated = await send(base, '/api/admin/session', { password: 'a-properly-long-admin-secret' }, { cookie });
    expect(elevated.status).toBe(200);
    expect((await elevated.json()).promoted).toBe(true);

    // The role now persists, so the password is never needed again.
    const again = await send(base, '/api/account/login', { username: 'pilot', pin: '482951' });
    const freshCookie = again.headers.get('set-cookie')!.split(';')[0];
    expect((await again.json()).isAdmin).toBe(true);
    expect((await send(base, '/api/admin/session', {}, { cookie: freshCookie })).status).toBe(200);
  });

  it('still rejects cross-site writes on administrative routes', async () => {
    const store = open();
    const base = await ready(build(store));
    expect((await send(base, '/api/admin/session', {}, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
    const noHeader = await fetch(base + '/api/admin/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    expect(noHeader.status).toBe(403);
  });
});
