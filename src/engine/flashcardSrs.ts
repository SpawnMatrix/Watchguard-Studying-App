import { BOX_COUNT, dueAt } from './srs';

/**
 * Spaced repetition for flashcards, on the same Leitner boxes and intervals as practice questions
 * (srs.ts): 0, 1, 3, 7 and 21 days, a miss drops straight back to box 1, and box 5 is retained.
 *
 * Before 1.25.0 a flashcard was either "mastered" by hand or not, and the deck was a list to page
 * through. This adds the other half of the routine: a Due today deck that brings each card back
 * when its interval says so, and introduces a few new cards a day rather than all 300 at once.
 *
 * Pure: state in, state out. The component owns persistence.
 */
export const FLASHCARD_SRS_KEY = 'watchguard-flashcard-srs-v1';

/** New cards a day. Enough to move through a track in a few weeks, few enough to finish daily. */
export const NEW_CARDS_PER_DAY = 10;

/** Bounds what the server accepts; well above the 489 cards that exist. */
export const MAX_SCHEDULED_CARDS = 2000;

export interface FlashcardSchedule {
  /** 1-based Leitner box; box 5 is retained and no longer scheduled. */
  box: number;
  /** Epoch ms when the card is due again. */
  due: number;
  /** Epoch ms of the first review, which is what spends a day's new-card allowance. */
  first: number;
}
export type FlashcardSrs = Record<string, FlashcardSchedule>;

export function validFlashcardSrs(value: unknown): value is FlashcardSrs {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= MAX_SCHEDULED_CARDS && entries.every(([id, card]: [string, any]) =>
    /^\d{1,6}$/.test(id) && card !== null && typeof card === 'object' && !Array.isArray(card) &&
    Number.isInteger(card.box) && card.box >= 1 && card.box <= BOX_COUNT &&
    Number.isFinite(card.due) && Number.isFinite(card.first) && card.first >= 0);
}

/** "Knew it" moves a card up one box; "Again" sends it back to box 1, due immediately. */
export function gradeCard(state: FlashcardSrs, id: number, knew: boolean, now = Date.now()): FlashcardSrs {
  const previous = state[String(id)];
  const box = knew ? Math.min((previous?.box ?? 1) + 1, BOX_COUNT) : 1;
  return { ...state, [String(id)]: { box, due: dueAt(box, now), first: previous?.first ?? now } };
}

/** Local midnight, so "today" means the learner's day rather than UTC's. */
export const startOfDay = (now: number) => new Date(now).setHours(0, 0, 0, 0);

export interface DueDeck {
  /**
   * Cards to study now: reviews whose interval has passed, soonest first, then today's new cards, then
   * cards in box 1. Box 1 is what was just missed, and showing it again straight away tests short-term
   * memory of the answer you have only just read; the end of the deck puts some distance in.
   */
  cards: number[];
  reviews: number;
  fresh: number;
  /** When the next scheduled card comes due, if nothing is due now. */
  nextDue: number | null;
}

/**
 * Builds today's deck from the cards in view. Cards marked mastered by hand are left out: the
 * learner retired them on purpose, and the schedule should not argue.
 */
export function dueDeck(cardIds: readonly number[], state: FlashcardSrs, mastered: readonly number[], now = Date.now(),
  newPerDay = NEW_CARDS_PER_DAY): DueDeck {
  const retired = new Set(mastered);
  const active = cardIds.filter(id => !retired.has(id));
  const scheduled = active.filter(id => state[String(id)]);
  const reviews = scheduled
    .filter(id => { const card = state[String(id)]; return card.box < BOX_COUNT && card.due <= now; })
    .sort((a, b) => state[String(a)].due - state[String(b)].due);
  const today = startOfDay(now);
  // Counted across every scheduled card, so switching category cannot reset the allowance.
  const introducedToday = Object.values(state).filter(card => card.first >= today).length;
  const fresh = active.filter(id => !state[String(id)]).slice(0, Math.max(0, newPerDay - introducedToday));
  const upcoming = scheduled.map(id => state[String(id)]).filter(card => card.box < BOX_COUNT && card.due > now).map(card => card.due);
  const relearn = reviews.filter(id => state[String(id)].box === 1);
  const review = reviews.filter(id => state[String(id)].box > 1);
  return { cards: [...review, ...fresh, ...relearn], reviews: reviews.length, fresh: fresh.length, nextDue: upcoming.length ? Math.min(...upcoming) : null };
}
