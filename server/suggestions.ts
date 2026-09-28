import type { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { AccountError } from './accounts';

/**
 * The suggestion board.
 *
 * The hard requirement is that an anonymous post is anonymous to *us*, not
 * only to other learners. So no row here carries an account id, and there is
 * no column it could be written to — that is the guarantee, and
 * `suggestions.test.ts` asserts the schema keeps it.
 *
 * A reply still has to reach whoever asked, which normally means storing who
 * they are. Instead, posting returns a random **claim** that only the author's
 * browser keeps; the server stores its digest. To see replies, a browser
 * presents the claims it holds and the server answers for exactly those,
 * without ever learning whose they are.
 *
 * What that costs, stated plainly: clearing browser storage loses the thread,
 * the same trade as losing a recovery code. And posting requires a signed-in
 * learner, so the server momentarily authenticates someone it then declines to
 * record — a spam control that deliberately leaves no trace.
 */

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * `pending` and `declined` are visible only to an administrator. The other
 * three are the public board, which doubles as the roadmap.
 */
export const STATUSES = ['pending', 'declined', 'open', 'planned', 'shipped'] as const;
export type SuggestionStatus = typeof STATUSES[number];
export const PUBLIC_STATUSES: SuggestionStatus[] = ['open', 'planned', 'shipped'];

export const MAX_BODY_CHARS = 1500;
const MIN_BODY_CHARS = 10;
export const MAX_REPLY_CHARS = 1500;
/** More than this from one browser is a script, not a person with ideas. */
export const MAX_CLAIMS_PER_REQUEST = 50;

export interface Suggestion {
  id: number;
  body: string;
  /** The name the author chose to show, or null when they posted anonymously. */
  displayName: string | null;
  status: SuggestionStatus;
  adminReply: string | null;
  createdAt: number;
  updatedAt: number;
}

type Row = {
  id: number; body: string; display_name: string | null; status: string;
  admin_reply: string | null; created_at: number; updated_at: number;
};

const toSuggestion = (row: Row): Suggestion => ({
  id: row.id,
  body: row.body,
  displayName: row.display_name,
  status: row.status as SuggestionStatus,
  adminReply: row.admin_reply,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Trims and bounds a post body, or explains what is wrong with it. */
export function checkBody(value: unknown): string {
  if (typeof value !== 'string') throw new AccountError(400, 'Write your idea before sending.');
  const body = value.trim();
  if (body.length < MIN_BODY_CHARS) throw new AccountError(400, `Say a little more — at least ${MIN_BODY_CHARS} characters.`);
  if (body.length > MAX_BODY_CHARS) throw new AccountError(400, `Keep it under ${MAX_BODY_CHARS} characters.`);
  return body;
}

export class SuggestionStore {
  constructor(private readonly db: DatabaseSync) {
    /**
     * Note what is absent: no `account_id`, and no column that could hold one.
     * `claim_hash` is the only route back to an author, and it resolves only
     * in the direction the author's own browser can drive.
     */
    this.db.exec(`CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY,
      body TEXT NOT NULL,
      display_name TEXT,
      claim_hash TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_reply TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status, created_at);`);
  }

  /**
   * Records a post and returns the claim its author must keep.
   *
   * `displayName` is supplied by the caller from the session, never by the
   * request body, so a post cannot be signed with somebody else's name. Pass
   * null to post anonymously, and nothing about the author is written at all.
   */
  create(body: unknown, displayName: string | null, now = Date.now()): { id: number; claim: string } {
    const text = checkBody(body);
    const claim = randomBytes(24).toString('base64url');
    const row = this.db.prepare(`INSERT INTO suggestions
      (body, display_name, claim_hash, status, created_at, updated_at)
      VALUES (?,?,?,'pending',?,?)`).run(text, displayName, digest(claim), now, now);
    return { id: Number(row.lastInsertRowid), claim };
  }

  /** The public board, newest first. Never includes pending or declined. */
  published(): Suggestion[] {
    const marks = PUBLIC_STATUSES.map(() => '?').join(',');
    return (this.db.prepare(`SELECT * FROM suggestions WHERE status IN (${marks}) ORDER BY created_at DESC`)
      .all(...PUBLIC_STATUSES) as Row[]).map(toSuggestion);
  }

  /**
   * The posts behind the claims a browser is holding.
   *
   * This is the only lookup that crosses from a person to their posts, and it
   * runs in the one direction that needs no identity: the caller proves which
   * posts are theirs by holding the claim, and the server learns nothing else.
   *
   * Each post comes back with the claim that matched it. The caller supplied
   * that claim, so echoing it reveals nothing — and without it the client
   * cannot tell which of its own posts is which, which is how a "withdraw"
   * button ends up deleting the wrong one.
   */
  byClaims(claims: unknown): (Suggestion & { claim: string })[] {
    if (!Array.isArray(claims) || claims.length === 0) return [];
    const usable = claims
      .filter((claim): claim is string => typeof claim === 'string' && claim.length > 0 && claim.length <= 100)
      .slice(0, MAX_CLAIMS_PER_REQUEST);
    if (usable.length === 0) return [];
    const byHash = new Map(usable.map(claim => [digest(claim), claim]));
    const hashes = [...byHash.keys()];
    const marks = hashes.map(() => '?').join(',');
    return (this.db.prepare(`SELECT * FROM suggestions WHERE claim_hash IN (${marks}) ORDER BY created_at DESC`)
      .all(...hashes) as (Row & { claim_hash: string })[])
      .map(row => ({ ...toSuggestion(row), claim: byHash.get(row.claim_hash) ?? '' }));
  }

  /** Everything, for the moderation queue: pending first, then newest. */
  all(): Suggestion[] {
    return (this.db.prepare(`SELECT * FROM suggestions
      ORDER BY (status='pending') DESC, created_at DESC`).all() as Row[]).map(toSuggestion);
  }

  /**
   * Publishes, declines or re-files a post, optionally with a reply.
   *
   * Passing `reply` as undefined leaves an existing one alone; passing an
   * empty string clears it. `updatedAt` moves, which is what tells the
   * author's browser there is something new to look at.
   */
  decide(id: unknown, status: unknown, reply: unknown, now = Date.now()): Suggestion {
    if (!Number.isSafeInteger(id) || Number(id) <= 0) throw new AccountError(400, 'Unknown suggestion.');
    const key = Number(id);
    if (typeof status !== 'string' || !STATUSES.includes(status as SuggestionStatus)) {
      throw new AccountError(400, 'Unknown status.');
    }
    let nextReply: string | null | undefined;
    if (reply !== undefined) {
      if (reply === null || (typeof reply === 'string' && reply.trim() === '')) nextReply = null;
      else if (typeof reply !== 'string') throw new AccountError(400, 'A reply must be text.');
      else if (reply.length > MAX_REPLY_CHARS) throw new AccountError(400, `Keep the reply under ${MAX_REPLY_CHARS} characters.`);
      else nextReply = reply.trim();
    }
    const existing = this.db.prepare('SELECT * FROM suggestions WHERE id=?').get(key) as Row | undefined;
    if (!existing) throw new AccountError(404, 'That suggestion is no longer there.');
    this.db.prepare('UPDATE suggestions SET status=?, admin_reply=?, updated_at=? WHERE id=?')
      .run(status, nextReply === undefined ? existing.admin_reply : nextReply, now, key);
    return toSuggestion(this.db.prepare('SELECT * FROM suggestions WHERE id=?').get(key) as Row);
  }

  /**
   * Withdraws a post, for an author who has changed their mind.
   *
   * Guarded on the claim, so this is the one destructive action on the board
   * and only the browser that created the post can take it.
   */
  withdraw(claim: unknown): boolean {
    if (typeof claim !== 'string' || !claim || claim.length > 100) return false;
    return Number(this.db.prepare('DELETE FROM suggestions WHERE claim_hash=?').run(digest(claim)).changes) > 0;
  }

  /** How many are waiting on an administrator. A count, never a roster. */
  pendingCount(): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM suggestions WHERE status='pending'").get() as { n: number }).n;
  }
}
