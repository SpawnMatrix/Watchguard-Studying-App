import { describe, expect, it } from 'vitest';
import { generateQuestion, questionTemplates } from './templates';

/**
 * The answer-length guard for generated scenarios. `src/data/answerLength.test.ts` only covers the
 * authored bank, and before this nothing measured the templates: the correct answer was the longest
 * option in 51% of sampled variants, and in every variant of 18 templates. A learner who picked the
 * longest, most careful-sounding option scored well without reading the log.
 *
 * Options of 22 characters or fewer (addresses, ports, commands) are left out: length cannot cue an
 * answer at that size.
 */
const SEEDS = 40;
const sampled = questionTemplates.flatMap(t => Array.from({ length: SEEDS }, (_, seed) => generateQuestion({ templateId: t.id, seed, version: 1 })))
  .filter(q => q.correctAnswers.length === 1 && q.type !== 'ordering' && q.options.length >= 3 && Math.max(...q.options.map(o => o.length)) > 22);

const longestOther = (q: (typeof sampled)[number]) => Math.max(...q.options.filter(o => o !== q.correctAnswers[0]).map(o => o.length));
const longerOthers = (q: (typeof sampled)[number]) => q.options.filter(o => o !== q.correctAnswers[0] && o.length > q.correctAnswers[0].length).length;

describe('generated scenario answer length', () => {
  it('measures a meaningful sample', () => {
    expect(sampled.length).toBeGreaterThan(1000);
  });

  it('never makes the key clearly longer than every distractor', () => {
    const giveaways = [...new Set(sampled.filter(q => q.correctAnswers[0].length > longestOther(q) + 4).map(q => q.id))];
    expect(giveaways).toEqual([]);
  });

  it('keeps the key the longest option about as often as chance', () => {
    const share = sampled.filter(q => q.correctAnswers[0].length > longestOther(q)).length / sampled.length;
    expect(share).toBeGreaterThanOrEqual(0.15);
    expect(share).toBeLessThanOrEqual(0.35);
  });

  it('spreads the key across length positions rather than pinning it one place down', () => {
    for (let rank = 0; rank <= 3; rank++) {
      const share = sampled.filter(q => Math.min(longerOthers(q), 3) === rank).length / sampled.length;
      expect(share, `key with ${rank} longer option(s)`).toBeLessThanOrEqual(0.5);
    }
  });

  it('keeps options within a question close in length', () => {
    const uneven = sampled.filter(q => {
      const lengths = q.options.map(o => o.length);
      return (Math.max(...lengths) - Math.min(...lengths)) / Math.max(...lengths) > 0.3;
    }).length / sampled.length;
    expect(uneven).toBeLessThanOrEqual(0.2);
  });
});
