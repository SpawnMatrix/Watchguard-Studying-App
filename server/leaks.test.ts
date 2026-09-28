import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { AccountStore } from './accounts';
import { accountRoutes } from './accountRoutes';
import { adminRoutes } from './adminRoutes';
import { securityHeaders, requireSameSiteWrite } from './security';
import { labDiagnosticProblem, quizEvaluationProblem, MAX_ISSUE_CHARS, MAX_QUESTION_CHARS, MAX_OPTIONS, MAX_OPTION_CHARS } from './tutorInput';

/**
 * Checks that one account cannot learn about another, including by watching
 * how long an answer takes, and that the transport promises in the README are
 * the ones the server actually makes.
 */

const stores: AccountStore[] = []; const servers: Server[] = [];
const open = () => { const s = new AccountStore(':memory:'); stores.push(s); return s; };

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.close(() => resolve()); server.closeAllConnections();
  })));
  for (const s of stores.splice(0)) { try { s.close(); } catch { } }
  delete process.env.COOKIE_SECURE;
  delete process.env.NODE_ENV;
});

describe('account enumeration', () => {
  /** Median of `runs` timings, so one slow scheduling slice cannot decide a test. */
  const median = async (runs: number, work: () => Promise<unknown>) => {
    const samples: number[] = [];
    for (let i = 0; i < runs; i += 1) {
      const start = performance.now();
      await work().catch(() => { });
      samples.push(performance.now() - start);
    }
    return samples.sort((a, b) => a - b)[Math.floor(runs / 2)];
  };

  it('answers recovery in the same time whether or not the account exists', async () => {
    const store = open();
    await store.register('pilot', '482951');
    // Deliberately wrong codes: the question is whether the *username* leaks,
    // which must not depend on the code being right.
    const real = await median(3, () => store.recover('pilot', 'not-the-code', '739162'));
    const absent = await median(3, () => store.recover('ghost_pilot', 'not-the-code', '739162'));

    // Before the fix an absent account skipped key derivation entirely and
    // came back in roughly a millisecond against ~100ms for a real one.
    expect(absent).toBeGreaterThan(real * 0.4);
    expect(absent).toBeLessThan(real * 3);
  }, 30_000);

  it('gives a legacy recovery record the same cost as a current one', async () => {
    const store = open();
    const account = await store.register('pilot', '482951');
    store.db.prepare("UPDATE accounts SET recovery_kdf='sha256', recovery_salt='' WHERE id=?").run(account.accountId);
    const legacy = await median(3, () => store.recover('pilot', 'not-the-code', '739162'));
    const absent = await median(3, () => store.recover('ghost_pilot', 'not-the-code', '739162'));
    // An unsalted SHA-256 verifies instantly, so without a cost floor this is
    // the same oracle in reverse: fast means the account is old but real.
    expect(legacy).toBeGreaterThan(absent * 0.4);
  }, 30_000);

  it('says the same thing either way', async () => {
    const store = open();
    await store.register('pilot', '482951');
    const messages = await Promise.all([
      store.recover('pilot', 'not-the-code', '739162').catch((e: Error) => e.message),
      store.recover('ghost_pilot', 'not-the-code', '739162').catch((e: Error) => e.message),
      store.login('pilot', '000000').catch((e: Error) => e.message),
      store.login('ghost_pilot', '000000').catch((e: Error) => e.message),
    ]);
    expect(messages[0]).toBe(messages[1]);
    expect(messages[2]).toBe(messages[3]);
  }, 30_000);

  it('still rejects a wrong code and still accepts the right one', async () => {
    const store = open();
    const account = await store.register('pilot', '482951');
    await expect(store.recover('pilot', 'wrong', '739162')).rejects.toMatchObject({ status: 401 });
    await expect(store.recover('pilot', '', '739162')).rejects.toMatchObject({ status: 401 });
    const reset = await store.recover('pilot', account.recoveryCode, '739162');
    expect(reset.username).toBe('pilot');
    expect(reset.recoveryCode).not.toBe(account.recoveryCode);
  }, 30_000);
});

describe('one account cannot read another', () => {
  const build = (store: AccountStore) => {
    const app = express();
    app.use(securityHeaders(process.env.NODE_ENV === 'production'));
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

  it('serves each session only its own progress, whatever the body claims', async () => {
    const store = open();
    const base = await ready(build(store));
    const one = await send(base, '/api/account/register', { username: 'pilot_one', pin: '482951' });
    const two = await send(base, '/api/account/register', { username: 'pilot_two', pin: '739162' });
    const cookieOne = one.headers.get('set-cookie')!.split(';')[0];
    const cookieTwo = two.headers.get('set-cookie')!.split(';')[0];

    const saved = { weakness_deck: JSON.stringify({ 10001: 1 }) };
    expect((await send(base, '/api/account/progress', { username: 'pilot_one', revision: 0, snapshot: saved }, { cookie: cookieOne }, 'PUT')).status).toBe(200);

    // Asking for someone else's data by name is refused, not served.
    expect((await send(base, '/api/account/progress', { username: 'pilot_one', revision: 0, snapshot: {} }, { cookie: cookieTwo }, 'PUT')).status).toBe(401);
    const mine = await (await fetch(base + '/api/account/me', { headers: { cookie: cookieTwo } })).json();
    expect(mine.username).toBe('pilot_two');
    expect(mine.snapshot).toEqual({});

    // A stale-revision conflict returns a snapshot; it must be the caller's.
    const conflict = await send(base, '/api/account/progress', { username: 'pilot_one', revision: 0, snapshot: saved }, { cookie: cookieOne }, 'PUT');
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).snapshot).toEqual(saved);
  }, 30_000);

  it('says nothing about other accounts in an error, and nothing at all without a session', async () => {
    const store = open();
    const base = await ready(build(store));
    await send(base, '/api/account/register', { username: 'pilot_one', pin: '482951' });

    const anonymous = await (await fetch(base + '/api/account/me')).json();
    expect(anonymous).toEqual({ username: null, isAdmin: false });

    const refused = await send(base, '/api/account/progress', { username: 'pilot_one', revision: 0, snapshot: {} }, {}, 'PUT');
    expect(refused.status).toBe(401);
    expect(JSON.stringify(await refused.json())).not.toContain('pilot_one');

    // Administration is a closed door to a signed-in learner who is not one.
    const learner = await send(base, '/api/account/login', { username: 'pilot_one', pin: '482951' });
    const cookie = learner.headers.get('set-cookie')!.split(';')[0];
    expect((await send(base, '/api/admin/session', {}, { cookie })).status).toBe(403);
    expect((await send(base, '/api/admin/users', undefined, { cookie }, 'GET')).status).toBe(403);
  }, 30_000);
});

describe('transport promises the README makes', () => {
  it('sets the header set and the cookie flags the docs describe', async () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SECURE = 'true';
    const store = open();
    const app = express();
    app.use(securityHeaders(true));
    app.use(express.json());
    app.use('/api/account', accountRoutes(store));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    const base = await new Promise<string>(resolve =>
      server.once('listening', () => resolve(`http://127.0.0.1:${(server.address() as any).port}`)));

    const response = await fetch(base + '/api/account/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Study-Request': '1' },
      body: JSON.stringify({ username: 'pilot', pin: '482951' }),
    });

    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('content-security-policy')).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    // Without this a click out of the app would tell the destination which
    // page of the study material the learner was reading.
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
    expect(response.headers.get('permissions-policy')).toContain('geolocation=()');
    expect(response.headers.get('strict-transport-security')).toContain('max-age=31536000');
    expect(response.headers.get('x-powered-by')).toBeNull();
    // A shared cache must not be able to keep somebody's progress.
    expect(response.headers.get('cache-control')).toBe('private, no-store');

    const cookie = response.headers.get('set-cookie')!;
    for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/']) expect(cookie).toContain(flag);
  }, 30_000);

  it('refuses a cross-site write on a tutor route', async () => {
    const app = express();
    app.use(express.json());
    app.post('/api/chat', requireSameSiteWrite, (_req, res) => res.json({ ok: true }));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    const base = await new Promise<string>(resolve =>
      server.once('listening', () => resolve(`http://127.0.0.1:${(server.address() as any).port}`)));

    const post = (headers: Record<string, string>) => fetch(base + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{"prompt":"hi"}',
    });
    expect((await post({})).status).toBe(403);
    expect((await post({ 'X-Study-Request': '1', 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
    expect((await post({ 'X-Study-Request': '1' })).status).toBe(200);
  }, 30_000);
});

describe('what the tutor routes will forward', () => {
  const long = (n: number) => 'x'.repeat(n);

  it('bounds every field of a lab diagnostic', () => {
    const ok = ['Lab 3: Branch office VPN', 'Step 2', 'Open Policy Manager and add a BOVPN gateway.', 'Phase 1 never completes.'] as const;
    expect(labDiagnosticProblem(ok[0], ok[1], ok[2], ok[3])).toBeNull();
    expect(labDiagnosticProblem(long(300), ok[1], ok[2], ok[3])).toMatch(/lab name/);
    expect(labDiagnosticProblem(ok[0], long(300), ok[2], ok[3])).toMatch(/step title/);
    expect(labDiagnosticProblem(ok[0], ok[1], long(5000), ok[3])).toMatch(/step instruction/);
    expect(labDiagnosticProblem(ok[0], ok[1], ok[2], long(MAX_ISSUE_CHARS + 1))).toMatch(/under/);
    expect(labDiagnosticProblem(ok[0], ok[1], ok[2], '   ')).toMatch(/went wrong/);
    expect(labDiagnosticProblem(undefined, undefined, undefined, undefined)).toMatch(/lab name/);
  });

  it('bounds the uncatalogued quiz question that reaches the model', () => {
    expect(quizEvaluationProblem('Which policy runs first?', ['A', 'B'], 'A', 'B')).toBeNull();
    // Options are optional; a bare question is still a legitimate shape.
    expect(quizEvaluationProblem('Which policy runs first?', undefined, undefined, undefined)).toBeNull();
    expect(quizEvaluationProblem(long(MAX_QUESTION_CHARS + 1), [], '', '')).toMatch(/question/);
    expect(quizEvaluationProblem('q', Array(MAX_OPTIONS + 1).fill('a'), 'a', 'a')).toMatch(/at most/);
    expect(quizEvaluationProblem('q', [long(MAX_OPTION_CHARS + 1)], 'a', 'a')).toMatch(/each option/);
    expect(quizEvaluationProblem('q', ['a'], long(9000), 'a')).toMatch(/selected answer/);
    expect(quizEvaluationProblem('q', ['a'], 'a', long(9000))).toMatch(/correct answer/);
    expect(quizEvaluationProblem('q', 'not-a-list', 'a', 'a')).toMatch(/list/);
    expect(quizEvaluationProblem('q', [1, 2], 'a', 'a')).toMatch(/list/);
  });

  it('leaves real content comfortably inside the ceilings', async () => {
    const { watchguardLabs } = await import('../src/data/labs');
    for (const lab of watchguardLabs) {
      for (const step of lab.steps) {
        expect(labDiagnosticProblem(lab.name, step.title, step.instruction, 'it does not work'), lab.name).toBeNull();
      }
    }
    const { studyQuestions } = await import('../src/engine/catalog');
    for (const question of studyQuestions) {
      expect(quizEvaluationProblem(question.question, question.options, question.options[0], question.correctAnswers[0]),
        String(question.id)).toBeNull();
    }
  }, 30_000);
});
