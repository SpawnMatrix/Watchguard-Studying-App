/**
 * The claims this browser holds for ideas posted from it.
 *
 * This file is the whole of the link between a person and what they wrote.
 * The server stores only a digest of each claim, so if this is cleared, the
 * post stays on the board and nothing — including us — can connect it back.
 * That is the point, and it is also the cost: it is the same trade as losing
 * a recovery code, and the UI says so before anyone posts.
 *
 * Deliberately outside `STUDY_KEYS`: syncing it to the server would rebuild
 * exactly the link the board exists to avoid.
 */
const KEY = 'watchguard-suggestion-claims-v1';

/** claim -> the `updatedAt` this browser has already shown its owner. */
export type ClaimBook = Record<string, number>;

export function readClaims(): ClaimBook {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const book: ClaimBook = {};
    for (const [claim, seen] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof claim === 'string' && claim.length > 0 && claim.length <= 100 && Number.isFinite(seen)) {
        book[claim] = Number(seen);
      }
    }
    return book;
  } catch { return {}; }
}

function write(book: ClaimBook): void {
  try { localStorage.setItem(KEY, JSON.stringify(book)); } catch { /* Storage is a nicety here. */ }
}

/** Remembers a claim the moment it is issued; it is never shown again. */
export function rememberClaim(claim: string): void {
  const book = readClaims();
  book[claim] = 0;
  write(book);
}

export function forgetClaim(claim: string): void {
  const book = readClaims();
  delete book[claim];
  write(book);
}

export interface MineEntry { claim: string; updatedAt: number; status: string; adminReply: string | null }

/**
 * Which of this browser's posts have changed since it last looked.
 *
 * Compares the server's `updatedAt` against what was stored, so a status
 * change and a reply both count, and re-reading the same state does not.
 */
export function unreadClaims(entries: MineEntry[]): MineEntry[] {
  const book = readClaims();
  return entries.filter(entry => entry.updatedAt > (book[entry.claim] ?? 0));
}

/**
 * Marks everything the server just reported as read.
 *
 * Claims the server did not return keep whatever they had rather than being
 * dropped: a failed or partial response is indistinguishable from a withdrawn
 * post here, and forgetting a claim is the one mistake that cannot be undone.
 */
export function markClaimsSeen(entries: MineEntry[]): void {
  const book = readClaims();
  for (const entry of entries) book[entry.claim] = entry.updatedAt;
  write(book);
}
