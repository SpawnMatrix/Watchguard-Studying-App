/**
 * Which Network Sandbox challenges have been solved.
 *
 * Until 1.24.0 this lived in component state, so the sandbox said "0 / 6 completed this visit" after
 * every reload and a learner could not tell which challenges they had already done. It is stored
 * under a study key, so it syncs with the account like lab progress does.
 */
export const SANDBOX_PROGRESS_KEY = 'watchguard-sandbox-progress-v1';

/** Far above the six challenges that exist; bounds what the server accepts. */
export const MAX_SANDBOX_CHALLENGES = 64;

/** A list of distinct challenge ids, each a short lowercase slug. */
export function validSandboxProgress(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= MAX_SANDBOX_CHALLENGES &&
    value.every(id => typeof id === 'string' && /^[a-z0-9-]{1,32}$/.test(id)) &&
    new Set(value).size === value.length;
}

/** Adds a solved challenge, keeping the stored order stable. */
export const markSolved = (done: readonly string[], id: string): string[] => done.includes(id) ? [...done] : [...done, id];

/** How many of the challenges that exist today are solved; ids from retired challenges do not count. */
export const solvedCount = (done: readonly string[], ids: readonly string[]) => ids.filter(id => done.includes(id)).length;
