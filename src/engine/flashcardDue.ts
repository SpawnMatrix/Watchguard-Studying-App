import { FLASHCARDS } from '../data/flashcards';
import { readJSON } from '../account/storage';
import { dueDeck, FLASHCARD_SRS_KEY, validFlashcardSrs } from './flashcardSrs';
import type { Track } from './types';

/** Loaded after Home paints; uses exactly the studio's track and daily allowance rules. */
export function flashcardsDue(track: Track, now = Date.now()): number {
  const ids = FLASHCARDS.filter(c => track === 'network-plus' ? c.category === 'Network+'
    : track === 'cloud' ? c.category === 'Cloud' : c.category !== 'Network+' && c.category !== 'Cloud').map(c => c.id);
  const saved = readJSON<unknown>(FLASHCARD_SRS_KEY, {});
  const mastered = readJSON<number[]>('watchguard_mastered_flashcards', []);
  return dueDeck(ids, validFlashcardSrs(saved) ? saved : {}, mastered, now).cards.length;
}
