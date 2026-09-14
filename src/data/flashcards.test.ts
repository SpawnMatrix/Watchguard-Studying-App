import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FLASHCARDS, HIGH_YIELD_FLASHCARDS } from './flashcards';
import { authoredQuestions } from './authoredQuestions';

const card = (id: number) => HIGH_YIELD_FLASHCARDS.find(c => c.id === id)!;
const text = (id: number) => `${card(id).question}\n${card(id).answer}\n${card(id).examTip ?? ''}`;
const handWritten = HIGH_YIELD_FLASHCARDS.map(c => `${c.question}\n${c.answer}\n${c.examTip ?? ''}`).join('\n');

describe('flashcard deck', () => {
  it('is the twenty hand-written cards followed by one card per authored question, with unique ids', () => {
    expect(HIGH_YIELD_FLASHCARDS).toHaveLength(20);
    expect(FLASHCARDS).toHaveLength(20 + authoredQuestions.length);
    expect(new Set(FLASHCARDS.map(c => c.id)).size).toBe(FLASHCARDS.length);
  });

  it('is what Flashcard Studio shows', () => {
    const studio = readFileSync(path.join(__dirname, '..', 'components', 'FlashcardStudio.tsx'), 'utf8');
    expect(studio).toMatch(/import \{ FLASHCARDS \} from '\.\.\/data\/flashcards'/);
    expect(studio).not.toMatch(/const HIGH_YIELD_FLASHCARDS/);
  });
});

describe('hand-written flashcards checked against the Study Guide', () => {
  it('give the management ports from the WatchGuard and WatchGuard Web UI policies', () => {
    for (const port of ['8080', '4117', '4118']) expect(text(2)).toContain(port);
    expect(handWritten).not.toContain('4105');
  });

  it('do not invent an "Enable NAT Loopback" setting', () => {
    expect(handWritten).not.toMatch(/Enable NAT Loopback/i);
    expect(text(6)).toMatch(/From list/);
  });

  it('describe Routing Table multi-WAN as ECMP and Failover as the default', () => {
    expect(text(12)).toMatch(/Routing Table: Equal-Cost Multi-Path \(ECMP\)/);
    expect(text(12)).toMatch(/Failover \(default\)/);
  });

  it('restore a backup image only to the Firebox that created it', () => {
    expect(text(20)).toMatch(/restores only to the Firebox that created it/);
  });
});
