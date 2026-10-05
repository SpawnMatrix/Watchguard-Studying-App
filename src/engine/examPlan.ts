import type { Track } from './types';

/**
 * Turns an exam date and the readiness breakdown into a daily plan.
 *
 * Exam readiness (mockExam.ts) answers "where am I weak"; this answers "so what do I do today". It is
 * deliberately arithmetic a learner can check, not a model: each category has work left - answers
 * still needed before it can be scored, questions missed last time, and bank not yet seen - and that
 * work is spread over the days before the exam, weighted the way the exam weights the categories.
 *
 * This module imports no question data, so Study Home can read the exam date without pulling the
 * catalogue into the first bundle. Callers pass in the readiness rows.
 */
export const EXAM_PLAN_KEY = 'watchguard-exam-date-v1';

/** The app's practice target, above the NSE pass mark of 75% so a bad day on the exam still passes. */
export const PLAN_TARGET = 85;
/** Share of each category's bank worth having answered before the exam. */
export const PLAN_COVERAGE = 0.6;
export const MIN_DAILY = 10;
export const MAX_DAILY = 80;

const DAY = 86_400_000;
const TRACKS: readonly Track[] = ['local', 'network-plus', 'cloud'];

/** Exam dates per track, as local calendar dates. */
export type ExamDates = Partial<Record<Track, string>>;

export function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject dates that roll over, such as 2026-02-31.
  return date.getMonth() === Number(m[2]) - 1 && date.getDate() === Number(m[3]) ? date : null;
}

export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function validExamDates(value: unknown): value is ExamDates {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(value).every(([track, day]) => TRACKS.includes(track as Track) && typeof day === 'string' && parseDay(day) !== null);
}

/** Whole calendar days from today to the exam; 0 on exam day, negative afterwards. Safe across DST. */
export function daysUntil(exam: string, now = Date.now()): number | null {
  const day = parseDay(exam);
  if (!day) return null;
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / DAY);
}

export interface PlanRow {
  domain: number;
  name: string;
  weight: number;
  answered: number;
  correct: number;
  available: number;
  score: number | null;
}

export type PlanPhase = 'learn' | 'review' | 'final' | 'today' | 'past';

export interface CategoryWork {
  domain: number;
  name: string;
  /** Answers still needed before the category can be scored at all. */
  toScore: number;
  /** Questions answered wrong the last time; re-answering them is the cheapest gain. */
  missed: number;
  /** Bank still to see to reach PLAN_COVERAGE. */
  unseen: number;
  need: number;
  /** Questions from this category in today's target. */
  today: number;
  reason: string;
}

export interface ExamPlan {
  daysLeft: number;
  phase: PlanPhase;
  /** Questions to answer per day until the exam; 0 on exam day and afterwards. */
  daily: number;
  /** True when even MAX_DAILY a day would not cover the remaining work. */
  behind: boolean;
  remaining: number;
  categories: CategoryWork[];
  /** Local calendar dates for the next mock exam and the last full one before the exam. */
  nextMock: string | null;
  finalMock: string | null;
}

function reasonFor(row: PlanRow, work: Omit<CategoryWork, 'today' | 'reason'>, minAnswers: number): string {
  if (row.score === null) return `${work.toScore} more answer${work.toScore === 1 ? '' : 's'} before it can be scored (${minAnswers} needed)`;
  if (row.score < PLAN_TARGET) return `at ${row.score}%, below the ${PLAN_TARGET}% target`;
  if (work.missed) return `${work.missed} missed question${work.missed === 1 ? '' : 's'} to re-answer`;
  return `${work.unseen} unseen question${work.unseen === 1 ? '' : 's'} to cover`;
}

/** Splits `total` across `shares` in proportion, by largest remainder, so the parts sum to `total`. */
function apportion(total: number, shares: readonly number[]): number[] {
  const sum = shares.reduce((a, b) => a + b, 0);
  if (!sum) return shares.map(() => 0);
  const exact = shares.map(s => (s / sum) * total);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) { if (left-- <= 0) break; parts[i]++; }
  return parts;
}

export function examPlan(examDay: string, rows: readonly PlanRow[], minAnswers: number, now = Date.now()): ExamPlan | null {
  const daysLeft = daysUntil(examDay, now);
  if (daysLeft === null) return null;
  const phase: PlanPhase = daysLeft < 0 ? 'past' : daysLeft === 0 ? 'today' : daysLeft <= 3 ? 'final' : daysLeft <= 14 ? 'review' : 'learn';

  const work = rows.map(row => {
    const toScore = Math.max(0, minAnswers - row.answered);
    const missed = row.answered - row.correct;
    const unseen = Math.max(0, Math.min(row.available, Math.ceil(row.available * PLAN_COVERAGE)) - row.answered);
    const need = Math.max(toScore, unseen) + missed;
    return { domain: row.domain, name: row.name, toScore, missed, unseen, need, weight: row.weight, row };
  });
  const remaining = work.reduce((sum, w) => sum + w.need, 0);

  // The day before the exam is for a light review, so it is not counted as a study day.
  const studyDays = Math.max(1, daysLeft - 1);
  const wanted = Math.ceil(remaining / studyDays);
  const active = daysLeft > 0;
  const daily = active ? Math.min(MAX_DAILY, Math.max(MIN_DAILY, wanted)) : 0;
  // Heavier categories get more of the day for the same amount of work left.
  const today = apportion(daily, work.map(w => w.need * w.weight));

  const shift = (days: number) => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return isoDay(d); };
  // A last full mock two days out leaves a day to act on it. Before that: weekly while learning,
  // every three days once revising. Inside three days there is no time to act on a mock's result.
  const finalMock = daysLeft >= 3 ? shift(daysLeft - 2) : null;
  const interval = phase === 'learn' ? 7 : 3;
  const nextMock = finalMock && interval < daysLeft - 2 ? shift(interval) : finalMock;

  return {
    daysLeft, phase, daily, behind: active && wanted > MAX_DAILY, remaining,
    categories: work
      .map((w, i) => ({ domain: w.domain, name: w.name, toScore: w.toScore, missed: w.missed, unseen: w.unseen, need: w.need, today: today[i], reason: reasonFor(w.row, w, minAnswers) }))
      .sort((a, b) => b.today - a.today || b.need - a.need),
    nextMock, finalMock,
  };
}
