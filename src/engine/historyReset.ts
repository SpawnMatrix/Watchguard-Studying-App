import type { QuizHistoryItem } from '../components/QuizAnalyticsPanel';

/**
 * Erasing answer history, made deliberate and undoable.
 *
 * Until this, "Reset statistics" sat 29px from Check answer on a phone and erased every answer on
 * every track with one tap, and the account sync sent the empty history to the server within a
 * second. History is what Study Home, exam readiness, the planner and weakness review are built from.
 */
export function eraseConfirmation(count: number): string {
  return `Erase all ${count} answer${count === 1 ? '' : 's'} on all three tracks?\n\n` +
    'Study Home, exam readiness and the exam planner start again from nothing, and your other devices ' +
    'receive the empty history. Flashcards, labs and the spaced-repetition schedule are not affected.\n\n' +
    'You can undo this until you leave Practice.';
}

/** Undo puts the erased answers back in front of any given since, so nothing is lost either way. */
export function restoreErased(erased: readonly QuizHistoryItem[], since: readonly QuizHistoryItem[]): QuizHistoryItem[] {
  return [...erased, ...since];
}
