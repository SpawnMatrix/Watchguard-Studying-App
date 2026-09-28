import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Server } from 'node:http';
import { AccountStore } from './accounts';
import { accountRoutes } from './accountRoutes';
import { adminRoutes } from './adminRoutes';
import { SuggestionStore, MAX_BODY_CHARS, MAX_CLAIMS_PER_REQUEST } from './suggestions';
import { suggestionRoutes } from './suggestionRoutes';

/**
 * The claim this board makes is that an anonymous post is anonymous to the
 * people running the server, not only to other learners. That is a property
 * of the schema as much as of the code, so it is tested as both.
 */

const stores: AccountStore[] = []; const servers: Server[] = [];
const open = () => {
  const accounts = new AccountStore(':memory:');
  stores.push(accounts);
  return { accounts, suggestions: new SuggestionStore(accounts.db) };
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.close(() => resolve()); server.closeAllConnections();
  })));
  for (const s of stores.splice(0)) { try { s.close(); } catch { } }
  delete process.env.ADMIN_BOOTSTRAP_USER;
});

describe('anonymity is structural, not a display rule', () => {
  it('has nowhere to put an account id', () => {
    const { accounts, suggestions } = open();
    void suggestions;
    const columns = (accounts.db.prepare('PRAGMA table_info(suggestions)').all() as { name: string }[])
      .map(c => c.name);
    expect(columns.sort()).toEqual(
      ['admin_reply', 'body', 'claim_hash', 'created_at', 'display_name', 'id', 'status', 'updated_at']);
    // The guarantee is the absence: no column could hold one even by mistake.
    for (const forbidden of ['account_id', 'user_id', 'username', 'author_id', 'ip', 'session']) {
      expect(columns, forbidden).not.toContain(forbidden);
    }
  });

  it('keeps no trace of the author of an anonymous post', () => {
    const { accounts, suggestions } = open();
    void accounts;
    suggestions.create('Please add more BOVPN practice questions.', null);
    const rows = JSON.stringify(suggestions.all());
    const raw = JSON.stringify(accounts.db.prepare('SELECT * FROM suggestions').all());
    expect(rows).not.toContain('pilot');
    expect(raw).not.toContain('pilot');
    expect(suggestions.all()[0].displayName).toBeNull();
  });

  it('stores the claim only as a digest, so the database cannot replay it', () => {
    const { accounts, suggestions } = open();
    const { claim } = suggestions.create('Please add more BOVPN practice questions.', null);
    const raw = JSON.stringify(accounts.db.prepare('SELECT * FROM suggestions').all());
    expect(raw).not.toContain(claim);
    expect(suggestions.byClaims([claim])).toHaveLength(1);
  });

  it('never writes a source file that reaches for an account id', () => {
    // A future edit adding `account_id` to this table would pass every
    // behavioural test above by simply not being exercised.
    const source = readFileSync(path.join(__dirname, 'suggestions.ts'), 'utf8')
      + readFileSync(path.join(__dirname, 'suggestionRoutes.ts'), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const forbidden of [/account_id/, /user_id/, /\breq\.ip\b/, /user\.id\b/]) {
      expect(code, `${forbidden} appears in the board's own code`).not.toMatch(forbidden);
    }
  });
});

describe('claims are the only way back to a post', () => {
  it('returns exactly the posts whose claims are presented', () => {
    const { suggestions } = open();
    const mine = suggestions.create('Please add more BOVPN practice questions.', null);
    const theirs = suggestions.create('The flashcards could use keyboard shortcuts.', 'pilot');

    expect(suggestions.byClaims([mine.claim]).map(s => s.id)).toEqual([mine.id]);
    expect(suggestions.byClaims([theirs.claim]).map(s => s.id)).toEqual([theirs.id]);
    expect(suggestions.byClaims([mine.claim, theirs.claim])).toHaveLength(2);
  });

  it('answers nothing to a guess', () => {
    const { suggestions } = open();
    suggestions.create('Please add more BOVPN practice questions.', null);
    for (const guess of [[], ['nope'], [''], [null], [{}], 'not-a-list', undefined, [123]]) {
      expect(suggestions.byClaims(guess), JSON.stringify(guess)).toEqual([]);
    }
  });

  it('refuses to be used as a bulk lookup', () => {
    const { suggestions } = open();
    const claims = Array.from({ length: MAX_CLAIMS_PER_REQUEST + 40 }, () =>
      suggestions.create('Please add more BOVPN practice questions.', null).claim);
    expect(suggestions.byClaims(claims).length).toBeLessThanOrEqual(MAX_CLAIMS_PER_REQUEST);
  });

  it('lets the author withdraw, and nobody else', () => {
    const { suggestions } = open();
    const { claim, id } = suggestions.create('Please add more BOVPN practice questions.', null);
    expect(suggestions.withdraw('someone-elses-claim')).toBe(false);
    expect(suggestions.all().map(s => s.id)).toEqual([id]);
    expect(suggestions.withdraw(claim)).toBe(true);
    expect(suggestions.all()).toEqual([]);
  });
});

describe('what the board shows', () => {
  it('hides a post until an administrator publishes it', () => {
    const { suggestions } = open();
    const { id, claim } = suggestions.create('Please add more BOVPN practice questions.', null);
    expect(suggestions.published()).toEqual([]);
    // The author can always see their own, pending or not.
    expect(suggestions.byClaims([claim])[0].status).toBe('pending');

    suggestions.decide(id, 'open', undefined);
    expect(suggestions.published().map(s => s.id)).toEqual([id]);

    suggestions.decide(id, 'declined', undefined);
    expect(suggestions.published()).toEqual([]);
    expect(suggestions.byClaims([claim])[0].status).toBe('declined');
  });

  it('carries a reply back to the author and onto the board', () => {
    const { suggestions } = open();
    const { id, claim } = suggestions.create('Please add more BOVPN practice questions.', null);
    const before = suggestions.byClaims([claim])[0].updatedAt;
    const decided = suggestions.decide(id, 'planned', 'Good idea — queued for the next content pass.', before + 1000);
    expect(decided.adminReply).toBe('Good idea — queued for the next content pass.');
    // updatedAt moving is what tells the author's browser to look again.
    expect(suggestions.byClaims([claim])[0].updatedAt).toBeGreaterThan(before);
  });

  it('keeps a reply when re-filing, and clears it when asked', () => {
    const { suggestions } = open();
    const { id } = suggestions.create('Please add more BOVPN practice questions.', null);
    suggestions.decide(id, 'open', 'Looking at it.');
    expect(suggestions.decide(id, 'planned', undefined).adminReply).toBe('Looking at it.');
    expect(suggestions.decide(id, 'planned', '').adminReply).toBeNull();
  });

  it('refuses a status it does not recognise, and an unknown post', () => {
    const { suggestions } = open();
    const { id } = suggestions.create('Please add more BOVPN practice questions.', null);
    expect(() => suggestions.decide(id, 'whatever', undefined)).toThrow(/status/);
    expect(() => suggestions.decide(999, 'open', undefined)).toThrow(/no longer there/);
    expect(() => suggestions.decide(id, 'open', 'x'.repeat(5000))).toThrow(/under/);
  });

  it('bounds what a post can carry', () => {
    const { suggestions } = open();
    expect(() => suggestions.create('too short', null)).toThrow(/at least/);
    expect(() => suggestions.create('x'.repeat(MAX_BODY_CHARS + 1), null)).toThrow(/under/);
    expect(() => suggestions.create(42, null)).toThrow(/before sending/);
    // Surrounding whitespace is not content.
    expect(suggestions.create('   Please add more BOVPN questions.   ', null).id).toBeGreaterThan(0);
    expect(suggestions.all()[0].body).toBe('Please add more BOVPN questions.');
  });
});

describe('over HTTP', () => {
  const build = () => {
    const { accounts, suggestions } = open();
    const app = express();
    app.use(express.json());
    app.use('/api/account', accountRoutes(accounts));
    app.use('/api/suggestions', suggestionRoutes(accounts, suggestions));
    app.use('/api/admin', adminRoutes(accounts, suggestions));
    const server = app.listen(0, '127.0.0.1'); servers.push(server);
    return { server, suggestions };
  };
  const ready = (server: Server) => new Promise<string>(resolve =>
    server.once('listening', () => resolve(`http://127.0.0.1:${(server.address() as any).port}`)));
  const send = (base: string, endpoint: string, body?: unknown, extra: Record<string, string> = {}, method = 'POST') =>
    fetch(base + endpoint, {
      method: body === undefined ? 'GET' : method,
      headers: { 'Content-Type': 'application/json', 'X-Study-Request': '1', ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('needs a signed-in learner to post, and records nothing about them', async () => {
    const { server } = build();
    const base = await ready(server);

    expect((await send(base, '/api/suggestions', { body: 'Please add more BOVPN practice questions.' })).status).toBe(401);

    const registered = await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];
    const posted = await send(base, '/api/suggestions', { body: 'Please add more BOVPN practice questions.' }, { cookie });
    expect(posted.status).toBe(200);
    const created = await posted.json();
    expect(created.claim).toBeTruthy();
    expect(created.status).toBe('pending');

    const mine = await (await send(base, '/api/suggestions/mine', { claims: [created.claim] })).json();
    expect(mine.suggestions).toHaveLength(1);
    expect(mine.suggestions[0].displayName).toBeNull();
    expect(JSON.stringify(mine)).not.toContain('pilot');
  }, 30_000);

  it('signs a post with the session name, never a name from the body', async () => {
    const { server } = build();
    const base = await ready(server);
    const registered = await send(base, '/api/account/register', { username: 'pilot', pin: '482951' });
    const cookie = registered.headers.get('set-cookie')!.split(';')[0];

    const posted = await send(base, '/api/suggestions',
      { body: 'Please add more BOVPN practice questions.', showName: true, displayName: 'chief' }, { cookie });
    const { claim } = await posted.json();
    const mine = await (await send(base, '/api/suggestions/mine', { claims: [claim] })).json();
    // The body asked to be signed "chief"; the session says otherwise.
    expect(mine.suggestions[0].displayName).toBe('pilot');
  }, 30_000);

  it('keeps the queue and the decision behind an administrator session', async () => {
    const { server } = build();
    const base = await ready(server);
    expect((await send(base, '/api/admin/suggestions', undefined, {}, 'GET')).status).toBe(403);
    expect((await send(base, '/api/admin/suggestions/decide', { id: 1, status: 'open' })).status).toBe(403);
  }, 30_000);

  it('publishes through the console and shows the reply to the author', async () => {
    process.env.ADMIN_BOOTSTRAP_USER = 'chief';
    const { server } = build();
    const base = await ready(server);
    const chief = await send(base, '/api/account/register', { username: 'chief', pin: '739162' });
    const chiefCookie = chief.headers.get('set-cookie')!.split(';')[0];
    const admin = (await send(base, '/api/admin/session', {}, { cookie: chiefCookie }))
      .headers.get('set-cookie')!.split(';')[0];

    const posted = await send(base, '/api/suggestions', { body: 'Please add more BOVPN practice questions.' }, { cookie: chiefCookie });
    const { id, claim } = await posted.json();

    expect((await (await send(base, '/api/suggestions', undefined, {}, 'GET')).json()).suggestions).toEqual([]);

    const queue = await (await send(base, '/api/admin/suggestions', undefined, { cookie: admin }, 'GET')).json();
    expect(queue.suggestions).toHaveLength(1);
    expect(queue.suggestions[0].status).toBe('pending');

    const decided = await send(base, '/api/admin/suggestions/decide',
      { id, status: 'planned', reply: 'Queued for the next content pass.' }, { cookie: admin });
    expect(decided.status).toBe(200);

    const board = await (await send(base, '/api/suggestions', undefined, {}, 'GET')).json();
    expect(board.suggestions.map((s: { id: number }) => s.id)).toEqual([id]);
    const mine = await (await send(base, '/api/suggestions/mine', { claims: [claim] })).json();
    expect(mine.suggestions[0].adminReply).toBe('Queued for the next content pass.');

    const me = await (await send(base, '/api/admin/me', undefined, { cookie: admin }, 'GET')).json();
    expect(me.pendingSuggestions).toBe(0);
  }, 30_000);

  it('refuses a cross-site write', async () => {
    const { server } = build();
    const base = await ready(server);
    const plain = await fetch(base + '/api/suggestions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Please add more BOVPN practice questions.' }),
    });
    expect(plain.status).toBe(403);
  }, 30_000);
});
