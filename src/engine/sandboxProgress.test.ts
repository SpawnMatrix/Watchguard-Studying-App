import { describe, expect, it } from 'vitest';
import { challenges } from '../components/network-simulator/engine';
import { MAX_SANDBOX_CHALLENGES, markSolved, solvedCount, validSandboxProgress } from './sandboxProgress';

describe('sandbox progress', () => {
  it('accepts every challenge id that exists, so a real solve can always be saved', () => {
    expect(challenges.length).toBeLessThanOrEqual(MAX_SANDBOX_CHALLENGES);
    expect(validSandboxProgress(challenges.map(c => c.id))).toBe(true);
  });

  it('rejects anything that is not a short list of distinct slugs', () => {
    for (const bad of [null, {}, 'dns', [1], ['dns', 'dns'], ['DNS'], ['a b'], ['x'.repeat(33)], Array.from({ length: 65 }, (_, i) => `c${i}`)])
      expect(validSandboxProgress(bad), JSON.stringify(bad)?.slice(0, 40)).toBe(false);
    expect(validSandboxProgress([])).toBe(true);
  });

  it('records a solve once and keeps the order it happened in', () => {
    expect(markSolved(markSolved(markSolved([], 'tls'), 'dns'), 'tls')).toEqual(['tls', 'dns']);
  });

  it('counts only challenges that still exist', () => {
    expect(solvedCount(['dns', 'retired-challenge'], challenges.map(c => c.id))).toBe(1);
  });
});
