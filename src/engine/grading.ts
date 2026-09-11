import type { Question } from '../data/questions';
export function gradeQuestion(question: Question, selected: readonly string[]): boolean {
  const expected = question.correctAnswers;
  if (selected.length !== expected.length || new Set(selected).size !== selected.length) return false;
  if (!selected.every(answer => question.options.includes(answer) && expected.includes(answer))) return false;
  // Ordering questions are graded on sequence, not membership: the whole
  // point is which policy sits above which, so a set comparison would mark
  // an incorrect order correct.
  if (question.type === 'ordering') return selected.every((answer, index) => answer === expected[index]);
  return true;
}
export function validateQuestion(q: Question): void {
  if (!Number.isSafeInteger(q.id) || !q.question.trim() || q.options.length < 2 ||
      q.options.some(x => !x.trim()) || new Set(q.options).size !== q.options.length ||
      !q.correctAnswers.length || new Set(q.correctAnswers).size !== q.correctAnswers.length ||
      q.correctAnswers.some(a => !q.options.includes(a)) || q.correctAnswersCount !== q.correctAnswers.length ||
      q.isMultiSelect !== (q.correctAnswers.length > 1)) throw new Error(`Invalid question ${q.id}`);
}
