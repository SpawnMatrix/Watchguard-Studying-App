/**
 * Whether a tab coming back into view should take a newer save from the server.
 *
 * Progress only ever flowed one way while a tab stayed open: this device pushed, and learned about
 * another device's saves only when its own next push was refused. Someone who studied on a phone and
 * then returned to a laptop tab left open since yesterday saw yesterday's progress, and their first
 * answer raised "Choose a save" between the two. Checking on the way back in avoids both.
 *
 * Local changes always win the right to be sent first: with anything pending, the normal save runs
 * and the server's revision check decides, exactly as before.
 */
export interface LocalSyncState {
  /** The account this tab is signed in to, or null when studying on this device only. */
  user: string | null;
  revision: number;
  pending: boolean;
  sending: boolean;
  conflicted: boolean;
  /** The account panel is open; replacing the page under it would lose what is being typed. */
  busy: boolean;
}

export interface RemoteSave { username: string | null; revision?: number }

export type Freshness = 'adopt' | 'signed-out' | 'current';

/** Never ask more often than this, however often focus moves between windows. */
export const REFRESH_INTERVAL_MS = 30_000;

export function canCheckRemote(state: LocalSyncState, lastCheck: number, now: number): boolean {
  return !!state.user && !state.pending && !state.sending && !state.conflicted && !state.busy && now - lastCheck >= REFRESH_INTERVAL_MS;
}

/** Decided after the request returns, against the state at that moment, since a change may have happened meanwhile. */
export function freshness(state: LocalSyncState, remote: RemoteSave): Freshness {
  if (!state.user || state.pending || state.sending || state.conflicted || state.busy) return 'current';
  if (!remote.username) return 'signed-out';
  if (remote.username !== state.user) return 'current';
  return Number.isSafeInteger(remote.revision) && remote.revision! > state.revision ? 'adopt' : 'current';
}
