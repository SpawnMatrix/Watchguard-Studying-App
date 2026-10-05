import type { Question } from '../data/questions';

/** The answer key, falling back to the single answer that older saved sessions carry. */
export const answerKey = (q: Pick<Question, 'correctAnswers' | 'correctAnswer'>): string[] =>
  q.correctAnswers?.length ? q.correctAnswers : [q.correctAnswer];

/** How a submitted option reads: the key, a wrong pick, or one the learner left alone. */
export type AnswerState = 'correct' | 'incorrect' | 'other';
export const answerState = (option: string, key: readonly string[], selected: readonly string[]): AnswerState =>
  key.includes(option) ? 'correct' : selected.includes(option) ? 'incorrect' : 'other';
