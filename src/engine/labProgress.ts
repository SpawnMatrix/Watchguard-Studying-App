import type { Lab } from '../data/labs';

/**
 * Step-level lab progress: which steps of each lab have been passed, and where to resume.
 *
 * Before this, leaving the Labs tab or reloading threw away every step, so a 5-step lab had to be
 * finished in one sitting or started again. It is stored under a study key, so it syncs with the
 * learner's account like the rest of their progress.
 */
export const LAB_PROGRESS_KEY = 'watchguard-lab-progress-v1';

export interface LabProgressEntry {
  /** Zero-based indexes of steps whose checkpoint has been passed. */
  done: number[];
  /** Zero-based index of the step to reopen. */
  step: number;
}
export type LabProgress = Record<string, LabProgressEntry>;

/** Upper bound on steps per lab; also bounds what the server accepts. */
export const MAX_LAB_STEPS = 50;

export function validLabProgress(value: unknown): value is LabProgress {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, entry]: [string, any]) =>
    /^\d{1,3}$/.test(id) && entry !== null && typeof entry === 'object' && !Array.isArray(entry) &&
    Array.isArray(entry.done) && entry.done.length <= MAX_LAB_STEPS &&
    entry.done.every((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < MAX_LAB_STEPS) &&
    Number.isInteger(entry.step) && entry.step >= 0 && entry.step < MAX_LAB_STEPS);
}

export const entryFor = (progress: LabProgress, lab: Lab): LabProgressEntry => {
  const saved = progress[String(lab.id)];
  // A lab whose step count shrank since it was saved must not resume past its end.
  const done = (saved?.done ?? []).filter(i => i < lab.steps.length);
  return { done, step: Math.min(saved?.step ?? 0, lab.steps.length - 1) };
};

export function markStepDone(progress: LabProgress, lab: Lab, index: number): LabProgress {
  const entry = entryFor(progress, lab);
  const done = entry.done.includes(index) ? entry.done : [...entry.done, index].sort((a, b) => a - b);
  const step = Math.min(index + 1, lab.steps.length - 1);
  return { ...progress, [String(lab.id)]: { done, step } };
}

export const setResumeStep = (progress: LabProgress, lab: Lab, index: number): LabProgress =>
  ({ ...progress, [String(lab.id)]: { ...entryFor(progress, lab), step: Math.max(0, Math.min(index, lab.steps.length - 1)) } });

export function resetLab(progress: LabProgress, lab: Lab): LabProgress {
  const next = { ...progress };
  delete next[String(lab.id)];
  return next;
}

export const isLabFinished = (progress: LabProgress, lab: Lab) => entryFor(progress, lab).done.length >= lab.steps.length;

/**
 * The furthest step a learner may open: every passed step, plus the first one not yet passed.
 * Jumping ahead would skip the checkpoints that make the lab worth doing.
 */
export function furthestReachable(progress: LabProgress, lab: Lab): number {
  const { done } = entryFor(progress, lab);
  for (let i = 0; i < lab.steps.length; i++) if (!done.includes(i)) return i;
  return lab.steps.length - 1;
}
