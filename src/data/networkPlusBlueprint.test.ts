import { describe, expect, it } from 'vitest';
import { studyQuestions } from '../engine/catalog';
import { blueprintCoverage, N10_009_WEIGHTS, NETWORK_PLUS_DOMAIN } from './networkPlusBlueprint';

/**
 * Keeps the Network+ bank shaped like the exam it prepares for.
 *
 * Before this existed the bank drilled Network Operations at 29% (exam: 19%) and Network Security at
 * 6% (exam: 14%). Nothing failed, because nothing measured it, and a learner scoring well here was
 * being told they were ready on a mix of questions the real exam does not ask.
 */
const networkPlus = studyQuestions.filter(q => q.track === 'network-plus');

/** Percentage points a domain may drift from its exam weighting before the bank is out of shape. */
const TOLERANCE = 3;

describe('Network+ exam blueprint', () => {
  it('uses the published N10-009 weightings', () => {
    const total = Object.values(N10_009_WEIGHTS).reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBe(100);
  });

  it('classifies every Network+ question against a domain', () => {
    // A new Network+ question must be placed in networkPlusBlueprint.ts, so its effect on the
    // domain balance is a decision someone made rather than an accident.
    const unclassified = networkPlus.filter(q => !NETWORK_PLUS_DOMAIN[q.id]).map(q => q.id);
    expect(unclassified, 'add these ids to NETWORK_PLUS_DOMAIN').toEqual([]);
  });

  it('classifies only questions that exist on the Network+ track', () => {
    const ids = new Set(networkPlus.map(q => q.id));
    const stale = Object.keys(NETWORK_PLUS_DOMAIN).map(Number).filter(id => !ids.has(id));
    expect(stale, 'remove or re-track these ids').toEqual([]);
  });

  it(`keeps every domain within ${TOLERANCE} points of its exam weighting`, () => {
    for (const d of blueprintCoverage(networkPlus.map(q => q.id))) {
      expect(Math.abs(d.gap), `${d.name}: bank ${d.share}% vs exam ${d.weight}% (${d.count} questions)`)
        .toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('has enough questions per domain to practise it on its own', () => {
    for (const d of blueprintCoverage(networkPlus.map(q => q.id))) {
      expect(d.count, `${d.name} is too thin to drill`).toBeGreaterThanOrEqual(20);
    }
  });
});
