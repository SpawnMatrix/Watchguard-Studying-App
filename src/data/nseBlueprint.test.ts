import { describe, expect, it } from 'vitest';
import { filterQuestions } from '../engine/catalog';
import { NSE_OVERRIDES, NSE_WEIGHTS, nseCategory, nseCoverage } from './nseBlueprint';

/**
 * Keeps the Local Firebox bank shaped like the WatchGuard Network Security Essentials exam.
 *
 * The first measurement found Network and Network Security Basics - 10% of the exam - represented by
 * one question out of 416, while Authentication and VPNs ran seven points over its weight.
 */
const local = filterQuestions({ track: 'local' });

/** Percentage points a category may drift from its published weight. */
const TOLERANCE = 5;

describe('NSE exam blueprint', () => {
  it('uses the published weights, which sum to 100', () => {
    expect(Object.values(NSE_WEIGHTS).reduce((sum, c) => sum + c.weight, 0)).toBe(100);
  });

  it('classifies every Local Firebox question', () => {
    const unclassified = local.filter(q => !nseCategory(q)).map(q => `${q.id} (${q.topic})`);
    expect(unclassified, 'add a topic default or an id override in nseBlueprint.ts').toEqual([]);
  });

  it('only overrides questions that exist on the Local Firebox track', () => {
    const ids = new Set(local.map(q => q.id));
    // Ranges are declared by section, so ids past the end of a section are allowed to be absent;
    // what must never happen is an override pointing at a question on another track.
    const elsewhere = Object.keys(NSE_OVERRIDES).map(Number).filter(id => !ids.has(id) && filterQuestions({ track: 'all' }).some(q => q.id === id));
    expect(elsewhere).toEqual([]);
  });

  it(`keeps every category within ${TOLERANCE} points of its exam weight`, () => {
    for (const c of nseCoverage(local)) {
      expect(Math.abs(c.gap), `${c.name}: bank ${c.share}% vs exam ${c.weight}% (${c.count} questions)`).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('has enough questions in every category to fill its share of a mock exam several times over', () => {
    for (const c of nseCoverage(local)) expect(c.count, c.name).toBeGreaterThanOrEqual(30);
  });
});
