import { describe, expect, it } from 'vitest';
import { examQuestions } from './questions';

/**
 * A learner who notices that the right answer is usually the longest, most careful option can pass
 * without knowing the material. These checks keep that giveaway out of the single-answer bank.
 */
const singleAnswer = examQuestions.filter(q => !q.isMultiSelect && q.correctAnswers.length === 1 && q.options.length >= 3);

function longestOther(q: (typeof singleAnswer)[number]) {
  const key = q.correctAnswers[0];
  return Math.max(...q.options.filter(o => o !== key).map(o => o.length));
}

describe('answer length', () => {
  it('never makes the key clearly longer than every distractor', () => {
    const giveaways = singleAnswer
      .filter(q => q.correctAnswers[0].length > longestOther(q) + 4)
      .map(q => `#${q.id}: ${q.correctAnswers[0]}`);
    expect(giveaways).toEqual([]);
  });

  it('keeps the key the longest option no more often than chance allows', () => {
    const longest = singleAnswer.filter(q => q.correctAnswers[0].length > longestOther(q)).length;
    expect(longest / singleAnswer.length).toBeLessThanOrEqual(0.35);
  });
});
