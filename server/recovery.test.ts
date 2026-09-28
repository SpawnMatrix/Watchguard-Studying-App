import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Server } from 'node:http';
import { AccountStore, canonicalRequestCode, displayRequestCode } from './accounts';
import { accountRoutes } from './accountRoutes';
import { adminRoutes } from './adminRoutes';

/**
 * Assisted recovery is split so that neither party can finish alone: the
 * learner cannot reset without an approval, and an approval is worthless
 * without the device that asked. These tests are written around that claim,
 * including the part of it that is not true — see the last block.
 */

const stores: AccountStore[] = []; const servers: Server[] = [];
const open = () => { const s = new AccountStore(':memory:'); stores.push(s); return s; };

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.close(() => resolve()); server.closeAllConnections();
  })));
  for (const s of stores.splice(0)) { try { s.close(); } catch { } }
  delete process.env.ADMIN_BOOTSTRAP_USER;
});

describe('request codes', () => {
  it('reads back the way a person would type it', () => {
    const store = open();
    const { code } = store.openRecoveryRequest('nobody');
    expect(code).toMatch(/^[ACDEFGHJKMNPQRTUVWXY2346789]{8}$/);
    expect(displayRequestCode(code)).toBe(`${code.slice(0, 4)}-${code.slice(4)}`);
    expect(canonicalRequestCode(displayRequestCode(code).toLowerCase())).toBe(code);
    expect(canonicalRequestCode(` ${code.slice(0, 4)} ${code.slice(4)} `)).toBe(code);
  });

  it('refuses anything that is not a code before it reaches the database', () => {
    for (const bad of ['', 'SHORT', 'TOOLONGACODE', 'ABCD-EFG0', 'O'.repeat(8), 42, null, 'x'.repeat(500)]) {
      expect(canonicalRequestCode(bad), String(bad)).toBe('');
    }
  });

  it('does not repeat itself', () => {
    const store = open();
    const codes = new Set(Array.from({ length: 40 }, () => store.openRecoveryRequest('nobody').code));
    expect(codes.size).toBe(40);
  });
});

describe('neither party can finish alone', () => {
  const start = async () => {
    const store = open();
    const account = await store.register('pilot', '482951');
    const request = store.openRecoveryRequest('pilot');
    return { store, account, request };
  };

  it('needs an approval before the learner can set a new PIN', async () => {
    const { store, request } = await start();
    await expect(store.completeRecovery(request.device, '739162')).rejects.toMatchObject({ status: 409 });
    store.approveRecoveryRequest(request.code);
    const reset = await store.completeRecovery(request.device, '739162');
    expect(reset.username).toBe('pilot');
    expect((await store.login('pilot', '739162')).username).toBe('pilot');
  }, 30_000);

  it('needs the device that asked, so an approved code alone resets nothing', async () => {
    const { store, request } = await start();
    store.approveRecoveryRequest(request.code);
    // An administrator holds the code. It is not a credential.
    await expect(store.completeRecovery('some-other-device-token', '739162')).rejects.toMatchObject({ status: 400 });
    await expect(store.completeRecovery(undefined, '739162')).rejects.toMatchObject({ status: 400 });
    // The learner's own device still works, so nothing was consumed.
    expect((await store.completeRecovery(request.device, '739162')).username).toBe('pilot');
  }, 30_000);

  it('spends the approval once', async () => {
    const { store, request } = await start();
    store.approveRecoveryRequest(request.code);
    await store.completeRecovery(request.device, '739162');
    await expect(store.completeRecovery(request.device, '305729')).rejects.toMatchObject({ status: 400 });
    expect(() => store.approveRecoveryRequest(request.code)).toThrow(/waiting for that code/);
  }, 30_000);

  it('expires, and an expired code cannot be approved or spent', async () => {
    const { store, request } = await start();
    const later = Date.now() + 16 * 60_000;
    expect(() => store.approveRecoveryRequest(request.code, later)).toThrow(/waiting for that code/);
    await expect(store.completeRecovery(request.device, '739162', later)).rejects.toMatchObject({ status: 400 });
  }, 30_000);

  it('leaves one live code per account when a learner asks twice', async () => {
    const { store, request } = await start();
    const second = store.openRecoveryRequest('pilot');
    expect(() => store.approveRecoveryRequest(request.code)).toThrow(/waiting for that code/);
    store.approveRecoveryRequest(second.code);
    expect((await store.completeRecovery(second.device, '739162')).username).toBe('pilot');
  }, 30_000);

  it('cannot be asked which usernames are real', async () => {
    const store = open();
    await store.register('pilot', '482951');
    // Both return a code; only one of them has anything behind it.
    const real = store.openRecoveryRequest('pilot');
    const invented = store.openRecoveryRequest('ghost_pilot');
    const malformed = store.openRecoveryRequest('!!');
    for (const issued of [real, invented, malformed]) expect(issued.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(() => store.approveRecoveryRequest(invented.code)).toThrow(/waiting for that code/);
    expect(() => store.approveRecoveryRequest(malformed.code)).toThrow(/waiting for that code/);
    store.approveRecoveryRequest(real.code);
  }, 30_000);

  it('retires every existing session and issues a new recovery code', async () => {
    const { store, account, request } = await start();
    store.save(account.accountId, 0, { weakness_deck: JSON.stringify({ 10001: 1 }) });
    store.approveRecoveryRequest(request.code);
    const reset = await store.completeRecovery(request.device, '739162');

    expect(store.identify(account.token)).toBeUndefined();
    expect(reset.recoveryCode).not.toBe(account.recoveryCode);
    await expect(store.recover('pilot', account.recoveryCode, '305729')).rejects.toMatchObject({ status: 401 });
    // The point of the exercise: the learner keeps their progress.
    expect(reset.snapshot).toEqual({ weakness_deck: JSON.stringify({ 10001: 1 }) });
    expect(reset.revision).toBe(1);
  }, 30_000);

  it('records that a recovery happened and nothing about who', async () => {
    const { store, request } = await start();
    expect(store.recoveryCount()).toBe(0);
    store.approveRecoveryRequest(request.code);
    await store.completeRecovery(request.device, '739162');
    expect(store.recoveryCount()).toBe(1);

    // Nothing left behind names the account or when it asked.
    expect(store.db.prepare('SELECT * FROM recovery_requests').all()).toHaveLength(0);
    const settings = JSON.stringify(store.db.prepare('SELECT * FROM settings').all());
    expect(settings).not.toContain('pilot');
  }, 30_000);
});

describe('changing a PIN without anybody else', () => {
  it('swaps the PIN, keeps the recovery code, and evicts other devices', async () => {
    const store = open();
    const first = await store.register('pilot', '482951');
    const second = await store.login('pilot', '482951');

    await expect(store.changePin(first.accountId, '000000', '739162')).rejects.toMatchObject({ status: 401 });
    await expect(store.changePin(first.accountId, '482951', '111111')).rejects.toMatchObject({ status: 400 });

    const changed = await store.changePin(first.accountId, '482951', '739162');
    expect(changed.username).toBe('pilot');
    expect(store.identify(first.token)).toBeUndefined();
    expect(store.identify(second.token)).toBeUndefined();
    expect(store.identify(changed.token)?.username).toBe('pilot');
    await expect(store.login('pilot', '482951')).rejects.toMatchObject({ status: 401 });
    expect((await store.login('pilot', '739162')).username).toBe('pilot');
    // A written-down recovery code must survive a routine PIN change.
    expect((await store.recover('pilot', first.recoveryCode, '305729')).username).toBe('pilot');
  }, 30_000);
});

describe('what an administrator can reach over HTTP', () => {
  const build = (store: AccountStore) => {
    const app = express();
    app.use(express.json());
    app.use('/api/account', accountRoutes(store));
    app.use('/api/admin', adminRoutes(store));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    return server;
  };
  const ready = (server: Server) => new Promise<string>(resolve =>
    server.once('listening', () => resolve(`http://127.0.0.1:${(server.address() as any).port}`)));
  const send = (base: string, endpoint: string, body?: unknown, extra: Record<string, string> = {}, method = 'POST') =>
    fetch(base + endpoint, {
      method: body === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json', 'X-Study-Request': '1', ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const asAdmin = async (base: string) => {
    process.env.ADMIN_BOOTSTRAP_USER = 'chief';
    const registered = await send(base, '/api/account/register', { username: 'chief', pin: '739162' });
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    const elevated = await send(base, '/api/admin/session', {}, { cookie });
    return { cookie, admin: elevated.headers.get('set-cookie')!.split(';')[0] };
  };

  it('no longer offers a list of accounts or a way to sign somebody out', async () => {
    const store = open();
    const base = await ready(build(store));
    const { admin } = await asAdmin(base);
    await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });

    // 410, not 404: the path answers "removed" for consoles still running the
    // previous build, and answers it with no data whatsoever.
    for (const gone of ["/api/admin/users", "/api/admin/users/sign-out"]) {
      const response = await send(base, gone, undefined, { cookie: admin }, 'GET');
      expect(response.status, gone).toBe(410);
      expect(JSON.stringify(await response.json())).not.toContain('pilot');
    }
    expect((await send(base, '/api/admin/users/sign-out', { username: 'pilot' }, { cookie: admin })).status).toBe(410);
    // And the store cannot produce one either.
    expect((store as unknown as { listAccounts?: unknown }).listAccounts).toBeUndefined();
  }, 30_000);

  it('tells an administrator a count, never a roster', async () => {
    const store = open();
    const base = await ready(build(store));
    const { admin } = await asAdmin(base);
    await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });

    const me = await (await send(base, '/api/admin/me', undefined, { cookie: admin }, 'GET')).json();
    expect(me.adminCount).toBe(1);
    expect(me.recoveriesCompleted).toBe(0);
    expect(JSON.stringify(me)).not.toContain('pilot');
  }, 30_000);

  it('runs the whole flow across three requests without naming the account', async () => {
    const store = open();
    const base = await ready(build(store));
    const { admin } = await asAdmin(base);
    await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });

    const asked = await send(base, '/api/account/recovery/request', { username: 'pilot' });
    const deviceCookie = asked.headers.get('set-cookie')!.split(';')[0];
    expect(deviceCookie.startsWith('wg_recovery=')).toBe(true);
    const { requestCode } = await asked.json();
    expect(requestCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    // Not yet approved.
    expect((await send(base, '/api/account/recovery/complete', { pin: '305729' }, { cookie: deviceCookie })).status).toBe(409);

    const approval = await send(base, '/api/admin/recovery/approve', { code: requestCode }, { cookie: admin });
    expect(approval.status).toBe(200);
    // The approval response says nothing about whose account it was.
    expect(JSON.stringify(await approval.json())).not.toContain('pilot');

    // An administrator holding the code still cannot finish it themselves.
    expect((await send(base, '/api/account/recovery/complete', { pin: '305729' }, { cookie: admin })).status).toBe(400);

    const done = await send(base, '/api/account/recovery/complete', { pin: '305729' }, { cookie: deviceCookie });
    expect(done.status).toBe(200);
    const body = await done.json();
    expect(body.username).toBe('pilot');
    expect(body.recoveryCode).toBeTruthy();
    expect(body.token).toBeUndefined();
    expect((await (await send(base, '/api/admin/me', undefined, { cookie: admin }, 'GET')).json()).recoveriesCompleted).toBe(1);
  }, 30_000);

  it('keeps approval behind an administrator session', async () => {
    const store = open();
    const base = await ready(build(store));
    await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });
    const asked = await send(base, '/api/account/recovery/request', { username: 'pilot' });
    const { requestCode } = await asked.json();
    expect((await send(base, '/api/admin/recovery/approve', { code: requestCode })).status).toBe(403);
  }, 30_000);

  it('still promotes and demotes by name, and still refuses the last administrator', async () => {
    const store = open();
    const base = await ready(build(store));
    const { admin } = await asAdmin(base);
    await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });

    expect((await send(base, '/api/admin/users/role', { username: 'chief', isAdmin: false }, { cookie: admin })).status).toBe(409);
    expect((await send(base, '/api/admin/users/role', { username: 'pilot', isAdmin: true }, { cookie: admin })).status).toBe(200);
    expect((await send(base, '/api/admin/users/role', { username: 'chief', isAdmin: false }, { cookie: admin })).status).toBe(200);
  }, 30_000);
});

describe('the limitation this design does not remove', () => {
  /**
   * Stated as a test rather than only as prose, so that nobody later reads the
   * two-party flow as a guarantee it does not make.
   *
   * An administrator who is willing to impersonate a learner can open a
   * request for that learner's username on their own machine, approve it with
   * their own session, and finish it on the same machine. The split stops an
   * approval being *useful to a third party*; it does not stop one person
   * playing both parts. Preventing that needs recovery bound to something only
   * the real owner holds — which is the self-service recovery code, or a
   * durable per-device identifier this app deliberately does not keep.
   *
   * What it does leave is evidence: every existing session dies, the recovery
   * code rotates, and the counter moves.
   */
  it('does not stop one person playing both parts', async () => {
    const store = open();
    const victim = await store.register('pilot', '482951');

    const request = store.openRecoveryRequest('pilot');
    store.approveRecoveryRequest(request.code);
    const seized = await store.completeRecovery(request.device, '739162');

    expect(seized.username).toBe('pilot');
    // The evidence the learner and the operator are left with.
    expect(store.identify(victim.token)).toBeUndefined();
    await expect(store.recover('pilot', victim.recoveryCode, '305729')).rejects.toMatchObject({ status: 401 });
    expect(store.recoveryCount()).toBe(1);
  }, 30_000);
});

describe('the console keeps step with the server', () => {
  const console_ = readFileSync(path.join(__dirname, '..', 'src/components/dashboard/AdminConsole.tsx'), 'utf8');

  it('does not ask for anything the server stopped offering', () => {
    expect(console_).not.toMatch(/\/users['"]/);
    expect(console_).not.toMatch(/users\/sign-out/);
    expect(console_).not.toMatch(/ManagedUser/);
  });

  it('offers approval and role changes, and shows a count rather than a list', () => {
    expect(console_).toMatch(/\/recovery\/approve/);
    expect(console_).toMatch(/users\/role/);
    expect(console_).toMatch(/recoveriesCompleted/);
  });
});
