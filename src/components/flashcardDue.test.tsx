import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The studio reads saved progress while rendering; node has no browser storage.
const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
const { default: FlashcardStudio } = await import('./FlashcardStudio');
const { NEW_CARDS_PER_DAY } = await import('../engine/flashcardSrs');
const { FLASHCARDS } = await import('../data/flashcards');
/** React separates adjacent text nodes with empty comments; the reader never sees them. */
const render = () => renderToStaticMarkup(<FlashcardStudio/>).replace(/<!-- -->/g, '');

describe('flashcard Due today deck', () => {
  it('opens on today’s deck, which for a new learner is one day’s worth of new cards', () => {
    memory.clear();
    const html = render();
    const pressed = html.match(/<button[^>]*aria-pressed="true"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(pressed).toContain(`Due today (${NEW_CARDS_PER_DAY})`);
    expect(html).toContain(`${NEW_CARDS_PER_DAY} left today: 0 to review, ${NEW_CARDS_PER_DAY} new.`);
    expect(html).toContain('New card');
  });

  it('says the day is done, and when the next card returns, once nothing is due', () => {
    memory.clear();
    const later = Date.now() + 86_400_000;
    // Every card already introduced today and scheduled for tomorrow.
    memory.set('watchguard-flashcard-srs-v1', JSON.stringify(Object.fromEntries(FLASHCARDS.map(c => [c.id, { box: 2, due: later, first: Date.now() }]))));
    const html = render();
    expect(html).toContain('Due today (0)');
    expect(html).toContain('You are done for today.');
    expect(html).toContain('The next card comes back');
  });
});
