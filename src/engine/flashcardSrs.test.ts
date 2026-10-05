import { describe, expect, it } from 'vitest';
import { FLASHCARDS } from '../data/flashcards';
import { MAX_SCHEDULED_CARDS, NEW_CARDS_PER_DAY, dueDeck, gradeCard, startOfDay, validFlashcardSrs, type FlashcardSrs } from './flashcardSrs';

const DAY = 86_400_000;
const NOON = new Date(2026, 9, 5, 12).getTime();
const ids = Array.from({ length: 30 }, (_, i) => i + 1);

describe('flashcard spaced repetition', () => {
  it('climbs one box per "Knew it" and falls to box 1 on "Again"', () => {
    let s: FlashcardSrs = {};
    s = gradeCard(s, 7, true, NOON);
    expect(s['7']).toMatchObject({ box: 2, due: NOON + DAY, first: NOON });
    s = gradeCard(s, 7, true, NOON + DAY);
    expect(s['7']).toMatchObject({ box: 3, due: NOON + 4 * DAY, first: NOON });
    s = gradeCard(s, 7, false, NOON + 4 * DAY);
    expect(s['7']).toMatchObject({ box: 1, due: NOON + 4 * DAY, first: NOON });
  });

  it('stops scheduling a card once it reaches box 5', () => {
    let s: FlashcardSrs = {};
    for (let i = 0; i < 6; i++) s = gradeCard(s, 3, true, NOON);
    expect(s['3'].box).toBe(5);
    expect(dueDeck([3], s, [], NOON + 365 * DAY, 0).cards).toEqual([]);
  });

  it('puts overdue reviews first, soonest first, then a day’s worth of new cards', () => {
    const s: FlashcardSrs = {
      '5': { box: 2, due: NOON - 2 * DAY, first: NOON - 9 * DAY },
      '2': { box: 3, due: NOON - 5 * DAY, first: NOON - 9 * DAY },
      '9': { box: 2, due: NOON + DAY, first: NOON - 9 * DAY },
    };
    const deck = dueDeck(ids, s, [], NOON);
    expect(deck.cards.slice(0, 2)).toEqual([2, 5]);
    expect(deck.reviews).toBe(2);
    expect(deck.fresh).toBe(NEW_CARDS_PER_DAY);
    expect(deck.cards).not.toContain(9);
    expect(deck.nextDue).toBe(NOON + DAY);
  });

  it('spends the new-card allowance per day, whichever category the cards came from', () => {
    let s: FlashcardSrs = {};
    for (const id of [101, 102, 103, 104]) s = gradeCard(s, id, true, NOON - 60_000);
    expect(dueDeck(ids, s, [], NOON).fresh).toBe(NEW_CARDS_PER_DAY - 4);
    // Tomorrow the allowance is fresh again.
    expect(dueDeck(ids, s, [], startOfDay(NOON) + DAY + 1).fresh).toBe(NEW_CARDS_PER_DAY);
  });

  it('sends a missed card to the end of today’s deck rather than straight back', () => {
    let s: FlashcardSrs = {};
    s = gradeCard(s, 1, false, NOON);
    const deck = dueDeck([1, 2, 3], s, [], NOON + 1000);
    expect(deck.cards).toEqual([2, 3, 1]);
    // Alone in the deck, it is still the card to study.
    expect(dueDeck([1], s, [], NOON + 1000).cards).toEqual([1]);
  });

  it('leaves out cards the learner marked mastered by hand', () => {
    const s: FlashcardSrs = { '4': { box: 1, due: NOON, first: NOON - DAY } };
    expect(dueDeck([4, 5], s, [4, 5], NOON).cards).toEqual([]);
  });

  it('validates what the server will store', () => {
    expect(validFlashcardSrs({})).toBe(true);
    expect(validFlashcardSrs(gradeCard({}, FLASHCARDS[0].id, true, NOON))).toBe(true);
    for (const bad of [null, [], { x: { box: 1, due: 1, first: 1 } }, { 1: { box: 0, due: 1, first: 1 } }, { 1: { box: 6, due: 1, first: 1 } },
      { 1: { box: 1, due: 'soon', first: 1 } }, { 1: { box: 1, due: 1 } }, { 1: null }])
      expect(validFlashcardSrs(bad), JSON.stringify(bad)).toBe(false);
    const huge = Object.fromEntries(Array.from({ length: MAX_SCHEDULED_CARDS + 1 }, (_, i) => [String(i), { box: 1, due: 0, first: 0 }]));
    expect(validFlashcardSrs(huge)).toBe(false);
  });

  it('has room for every flashcard that exists', () => {
    expect(FLASHCARDS.length).toBeLessThanOrEqual(MAX_SCHEDULED_CARDS);
    expect(FLASHCARDS.every(c => /^\d{1,6}$/.test(String(c.id)))).toBe(true);
  });
});
