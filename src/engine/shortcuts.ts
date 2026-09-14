/**
 * Keyboard shortcuts and in-URL navigation.
 *
 * Studying is repetitive: read, choose, check, next, hundreds of times. Doing that with a mouse is
 * slow, and losing your place on every reload is worse. These are the pure decisions behind both, kept
 * out of the components so they can be tested without a browser.
 */

/** True when a key press belongs to a form control, so shortcuts must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return !!el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName.toUpperCase());
}

/** True when Enter or Space would already activate the focused element, such as a button or link. */
export function activatesOnEnter(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; getAttribute?: (name: string) => string | null } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName.toUpperCase();
  return tag === 'BUTTON' || tag === 'A' || el.getAttribute?.('role') === 'button';
}

/**
 * True for a quiz option that is already chosen. Clicking an option leaves focus on it, and Enter would
 * then un-choose it; for a chosen option Enter checks the answer instead, which is what the hint promises.
 */
export function isChosenQuizOption(target: EventTarget | null): boolean {
  const el = target as { getAttribute?: (name: string) => string | null } | null;
  return !!el?.getAttribute && el.getAttribute('data-quiz-option') !== null && el.getAttribute('aria-pressed') === 'true';
}

export type QuizShortcut = { kind: 'select'; index: number } | { kind: 'submit' } | { kind: 'next' } | null;

interface QuizContext {
  key: string;
  /** Options that can be chosen by key; zero for question types with their own controls. */
  optionCount: number;
  hasSelection: boolean;
  submitted: boolean;
  ctrlOrMeta?: boolean;
  altKey?: boolean;
}

/**
 * 1-9 or A-Z choose the matching option (shown as A, B, C... on screen); Enter checks the answer, or
 * moves on once it has been checked. Nothing happens with modifier keys held, so browser shortcuts
 * such as Ctrl+R keep working.
 */
export function quizShortcut({ key, optionCount, hasSelection, submitted, ctrlOrMeta, altKey }: QuizContext): QuizShortcut {
  if (ctrlOrMeta || altKey) return null;
  if (key === 'Enter') return submitted ? { kind: 'next' } : hasSelection ? { kind: 'submit' } : null;
  if (submitted || optionCount === 0) return null;
  if (/^[1-9]$/.test(key)) {
    const index = Number(key) - 1;
    return index < optionCount ? { kind: 'select', index } : null;
  }
  if (/^[a-z]$/i.test(key)) {
    const index = key.toLowerCase().charCodeAt(0) - 97;
    return index < optionCount ? { kind: 'select', index } : null;
  }
  return null;
}

/** The section named in the URL hash, if it is one the app has. */
export function tabFromHash<T extends string>(hash: string, tabs: readonly T[]): T | null {
  const id = decodeURIComponent(hash.replace(/^#/, '')).trim();
  return (tabs as readonly string[]).includes(id) ? id as T : null;
}
