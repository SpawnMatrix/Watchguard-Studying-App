import { changelog, latestChangelogVersion, unseenEntries } from '../data/changelog';

/**
 * Which release the learner has already read about.
 *
 * Deliberately per-device and deliberately **not** in `STUDY_KEYS`: it is a
 * convenience, not study progress, and syncing it would add another per-person
 * field to the server for no benefit. Every access is guarded, because storage
 * throws rather than returns null in a locked-down browser.
 */
const SEEN_KEY = 'watchguard-changelog-seen-v1';

function read(): string | null {
  try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
}

/**
 * How many entries have arrived since this device last opened the list.
 *
 * A device that has never opened it counts zero, so somebody arriving for the
 * first time is not met with a badge for twenty releases they were never here
 * for. The first visit records where they came in.
 */
export function unseenChangelogCount(): number {
  const seen = read();
  if (seen === null) {
    // Record the starting point rather than counting everything as unread.
    markChangelogSeen();
    return 0;
  }
  return unseenEntries(seen).length;
}

/** Marks everything up to the newest entry as read. */
export function markChangelogSeen(): void {
  if (!latestChangelogVersion) return;
  try { localStorage.setItem(SEEN_KEY, latestChangelogVersion); } catch { /* Storage is a nicety here. */ }
}

/** The newest headline, for a one-line teaser elsewhere in the app. */
export const latestHeadline = changelog[0]?.headline ?? null;
