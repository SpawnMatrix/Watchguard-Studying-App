import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { examQuestions, verifyAnswer } from './questions';
import { authoredQuestions } from './authoredQuestions';
import { FLASHCARDS } from './flashcards';
import { trainingQuestions } from './training2026';
import { labBook2026Crosswalk, trainingLabs } from './trainingLabs2026';
import { watchguardLabs } from './labs';
import { handsOnLabs } from './labTasks';
import { checkpointFor } from './labCheckpoints';
import { nseCategory } from './nseBlueprint';

const ledger = JSON.parse(readFileSync(new URL('../../docs/source-review-2026.json', import.meta.url), 'utf8'));
const byId = new Map(examQuestions.map(q => [q.id, q]));
const newIds = new Set(trainingQuestions.map(q => q.id));
const normalize = (text: string) => text.normalize('NFC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

describe('2026 training source integration', () => {
  it('accounts for every source note exactly once, with valid destinations or a reason to hold it', () => {
    expect(ledger.notes).toHaveLength(276);
    expect(ledger.notes.map((n: { sourceIndex: number }) => n.sourceIndex)).toEqual(Array.from({ length: 276 }, (_, i) => i + 1));
    const ids = new Set(ledger.notes.map((n: { noteId: string }) => n.noteId));
    expect(ids.size).toBe(276);
    for (const n of ledger.notes) {
      expect(['reuse', 'new', 'duplicate', 'held']).toContain(n.disposition);
      expect(n.reason.length).toBeGreaterThan(30);
      if (n.disposition === 'held') expect(n.questionIds).toEqual([]);
      else {
        expect(n.questionIds.length).toBeGreaterThan(0);
        for (const id of n.questionIds) expect(byId.has(id), `note ${n.noteId} -> ${id}`).toBe(true);
      }
      if (n.disposition === 'duplicate') expect(ids.has(n.duplicateOfNoteId)).toBe(true);
    }
    expect(ledger.notes.filter((n: { imageReview?: string }) => n.imageReview)).toHaveLength(18);
  });

  it('preserves every pre-existing question identity and gives every new question one derived flashcard', () => {
    const previousIds = examQuestions.filter(q => !newIds.has(q.id)).map(q => q.id).sort((a, b) => a - b);
    const hash = createHash('sha256').update(JSON.stringify(previousIds)).digest('hex');
    expect(previousIds).toHaveLength(ledger.baseline.questionCount);
    expect(hash).toBe(ledger.baseline.questionIdsSha256);
    expect(byId.size).toBe(examQuestions.length);
    for (const q of trainingQuestions) {
      expect(authoredQuestions.filter(item => item.id === q.id)).toEqual([q]);
      const cards = FLASHCARDS.filter(card => card.id === 20000 + q.id);
      expect(cards).toHaveLength(1);
      expect(cards[0].answer).toContain(q.explanation);
      expect(examQuestions.filter(item => normalize(item.question) === normalize(q.question))).toHaveLength(1);
      expect(q.sources?.length).toBeGreaterThan(0);
      expect(q.firewareVersion).toBeTruthy();
      expect(nseCategory(q)).toBeDefined();
      expect(verifyAnswer(q.id, q.correctAnswers).isCorrect).toBe(true);
      expect(verifyAnswer(q.id, [q.options[1]]).isCorrect).toBe(false);
    }
  });

  it('retains version, policy-scope, and file-inspection distinctions that the supplied material blurred', () => {
    expect(byId.get(14)?.question).toContain('12.2.1');
    expect(byId.get(14)?.correctAnswers).not.toContain('Fireware OS');
    expect(byId.get(49)?.question).toContain('TCP and UDP');
    expect(byId.get(68)?.question).toContain('No other policy allows FTP');
    expect(byId.get(77)?.question).toContain('Manual-Order');
    expect(byId.get(71)?.question).toContain('body signature');
    expect(byId.get(51)?.question).not.toContain('(DNAT)');
    expect(byId.get(1083)?.question).toContain('only reachability test');
  });

  it('maps all fourteen exercises and keeps supplemental walkthroughs distinct from simulated tasks', () => {
    expect(labBook2026Crosswalk.map(row => row.exercise)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    for (const row of labBook2026Crosswalk) {
      for (const id of row.labIds) expect(watchguardLabs.some(lab => lab.id === id)).toBe(true);
      for (const id of row.questionIds) expect(byId.has(id), `exercise ${row.exercise} -> ${id}`).toBe(true);
    }
    expect(watchguardLabs.slice(0, 20).map(lab => [lab.id, lab.name, lab.steps.length])).toEqual(ledger.baseline.labs);
    for (const lab of trainingLabs) {
      expect(handsOnLabs[lab.id]).toBeUndefined();
      expect(lab.prerequisites).toContain('simulator');
      for (const step of lab.steps) expect(checkpointFor(lab.id, step.stepNumber)).toBeDefined();
    }
  });
});
