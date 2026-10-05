/**
 * Optional time limit for mock exams.
 *
 * Mock exams were untimed, so they measured knowledge but not pacing, and running out of time is a
 * common way to fail an exam you know well enough to pass. The limit here is a practice pace of one
 * minute per question, not any exam's official rule; the interface tells learners to check their own.
 *
 * The deadline is an absolute time stored with the session, so a reload neither pauses nor resets the
 * clock, which matches a real exam. Pure: the quiz engine owns the session.
 */
export const SECONDS_PER_QUESTION = 60;

export interface ExamTiming {
  startedAt: number;
  deadline: number;
  /** Set when the exam ends, by finishing or by running out of time. */
  endedAt?: number;
  timedOut?: boolean;
}

export const startTiming = (questions: number, now = Date.now()): ExamTiming =>
  ({ startedAt: now, deadline: now + questions * SECONDS_PER_QUESTION * 1000 });

export function validTiming(value: unknown): value is ExamTiming {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const t = value as Record<string, unknown>;
  return Number.isFinite(t.startedAt) && Number.isFinite(t.deadline) && (t.deadline as number) > (t.startedAt as number) &&
    (t.endedAt === undefined || Number.isFinite(t.endedAt)) && (t.timedOut === undefined || typeof t.timedOut === 'boolean');
}

/** Time left; frozen at the moment the exam ended, so results can say how much was spare. */
export const remainingMs = (timing: ExamTiming, now = Date.now()) => Math.max(0, timing.deadline - (timing.endedAt ?? now));

/** Time spent, never more than the limit. */
export const usedMs = (timing: ExamTiming, now = Date.now()) =>
  Math.max(0, Math.min(timing.deadline, timing.endedAt ?? now) - timing.startedAt);

export const isExpired = (timing: ExamTiming, now = Date.now()) => !timing.endedAt && now >= timing.deadline;

/** "mm:ss", or "h:mm:ss" from an hour up. Rounds up, so 0:00 means time is actually over. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export type Pace = 'ahead' | 'on pace' | 'behind';

/**
 * Compares questions answered with the share of the time used. One question of slack either way,
 * so the indicator does not flicker between states while a learner reads a long question.
 */
export function pace(timing: ExamTiming, answered: number, total: number, now = Date.now()): Pace {
  const used = Math.min(1, Math.max(0, (now - timing.startedAt) / (timing.deadline - timing.startedAt)));
  const expected = used * total;
  return answered > expected + 1 ? 'ahead' : answered < expected - 1 ? 'behind' : 'on pace';
}

/**
 * The last time mark crossed, for a screen reader; announcing every second would be noise. The UI
 * speaks it only when it changes, so each mark is announced once.
 */
export function announcement(ms: number): string | null {
  return ms <= 0 ? null : ms <= 60_000 ? 'One minute left.' : ms <= 5 * 60_000 ? 'Five minutes left.' : null;
}
