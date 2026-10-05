import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { filterQuestions, studyQuestions } from '../engine/catalog';
import { questionTemplates } from '../engine/templates';
import { faults } from '../engine/breakfix';
import { FLASHCARDS } from './flashcards';
import { labCheckpoints } from './labCheckpoints';
import { topologyQuestions } from './topologyQuestions';

/**
 * The README is the first thing a reviewer or a learner reads, and by 1.22.0 it undersold the bank
 * on every headline number: 630 questions for 658, 42 templates for 62, 300 flashcards for 489.
 * Each figure is read from the README and compared with the catalog, so a content PR that changes
 * a count fails here, on the PR that changed it, with the sentence to edit.
 */
const readme = readFileSync(path.resolve(__dirname, '../../README.md'), 'utf8');
const authored = studyQuestions.filter(q => !q.variant);

const claims: [string, RegExp, number][] = [
  ['authored questions', /\*\*(\d+) authored questions\*\*/, authored.length],
  ['diagram questions', /including a (\d+)-question diagram section/, topologyQuestions.length],
  ['diagram questions answered on the diagram', /\((\d+) answered by clicking the diagram itself\)/,
    topologyQuestions.filter(q => q.topology?.hotspots?.length).length],
  ['multi-select items', /and (\d+) multi-select items/, authored.filter(q => q.isMultiSelect).length],
  ['Local Firebox items (the NSE blueprint pool)', /all (\d+) Local Firebox items/, filterQuestions({ track: 'local' }).length],
  ['Network+ items (the N10-009 blueprint pool)', /: (\d+) items classified by domain/, studyQuestions.filter(q => q.track === 'network-plus').length],
  ['scenario templates', /\*\*(\d+) reproducible scenario templates\*\*/, questionTemplates.length],
  ['flashcards', /\*\*(\d+) flashcards\*\*/, FLASHCARDS.length],
  ['lab checkpoints', /checkpoint question \((\d+) in total\)/, Object.keys(labCheckpoints).length],
  ['break-fix fault types', /one fault from (\d+) types/, faults.length],
];

describe('README headline numbers', () => {
  it.each(claims)('states the real number of %s', (name, pattern, actual) => {
    const match = readme.match(pattern);
    expect(match, `README no longer states the ${name}; update the pattern in this test`).not.toBeNull();
    expect(Number(match![1]), `README says ${match![1]} ${name}; the catalog has ${actual}`).toBe(actual);
  });
});
