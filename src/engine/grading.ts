import type { Question } from '../data/questions';
export function gradeQuestion(question: Question, selected: readonly string[]): boolean {
  const expected = question.correctAnswers;
  return selected.length === expected.length && new Set(selected).size === selected.length &&
    selected.every(answer => question.options.includes(answer) && expected.includes(answer));
}
export function validateQuestion(q: Question): void {
  if (!Number.isSafeInteger(q.id) || !q.question.trim() || q.options.length < 2 ||
      q.options.some(x => !x.trim()) || new Set(q.options).size !== q.options.length ||
      !q.correctAnswers.length || new Set(q.correctAnswers).size !== q.correctAnswers.length ||
      q.correctAnswers.some(a => !q.options.includes(a)) || q.correctAnswersCount !== q.correctAnswers.length ||
      q.isMultiSelect !== (q.correctAnswers.length > 1)) throw new Error(`Invalid question ${q.id}`);
}
