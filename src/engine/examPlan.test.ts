import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MAX_DAILY, MIN_DAILY, PLAN_COVERAGE, daysUntil, examPlan, isoDay, parseDay, validExamDates, type PlanRow } from './examPlan';
import { examReadiness, READINESS_MIN_ANSWERS } from './mockExam';

const NOW = new Date(2026, 9, 5, 15, 30).getTime(); // Monday 5 October 2026, mid-afternoon
const day = (offset: number) => { const d = new Date(2026, 9, 5); d.setDate(d.getDate() + offset); return isoDay(d); };
const row = (domain: number, weight: number, answered: number, correct: number, available: number, score: number | null): PlanRow =>
  ({ domain, name: `Category ${domain}`, weight, answered, correct, available, score });

describe('exam plan', () => {
  it('counts calendar days in local time, including across a DST change', () => {
    expect(daysUntil(day(0), NOW)).toBe(0);
    expect(daysUntil(day(1), NOW)).toBe(1);
    expect(daysUntil(day(-1), NOW)).toBe(-1);
    // 25 October 2026 is the end of European summer time; 1 November the end of US daylight time.
    expect(daysUntil('2026-11-09', NOW)).toBe(35);
  });

  it('accepts only real calendar dates per known track', () => {
    expect(parseDay('2026-02-31')).toBeNull();
    expect(parseDay('2026-2-3')).toBeNull();
    expect(validExamDates({ local: '2026-11-02', 'network-plus': '2027-01-15' })).toBe(true);
    for (const bad of [null, [], { local: '02/11/2026' }, { local: '2026-13-01' }, { other: '2026-11-02' }, { local: 20261102 }])
      expect(validExamDates(bad), JSON.stringify(bad)).toBe(false);
  });

  it('spreads the remaining work over the days before the exam, leaving the eve for light review', () => {
    // One category, 100 questions, nothing answered: coverage asks for 60 answers.
    const plan = examPlan(day(7), [row(1, 100, 0, 0, 100, null)], READINESS_MIN_ANSWERS, NOW)!;
    expect(plan.remaining).toBe(Math.ceil(100 * PLAN_COVERAGE));
    expect(plan.daily).toBe(Math.ceil(60 / 6));
    expect(plan.phase).toBe('review');
  });

  it('never asks for less than a warm-up or more than a day can hold, and says when it is behind', () => {
    expect(examPlan(day(60), [row(1, 100, 58, 58, 100, 100)], 5, NOW)!.daily).toBe(MIN_DAILY);
    const crunch = examPlan(day(2), [row(1, 100, 0, 0, 1000, null)], 5, NOW)!;
    expect(crunch.daily).toBe(MAX_DAILY);
    expect(crunch.behind).toBe(true);
  });

  it('counts missed questions as work even in a category that is covered', () => {
    const plan = examPlan(day(30), [row(1, 100, 70, 60, 100, 86)], 5, NOW)!;
    expect(plan.categories[0]).toMatchObject({ missed: 10, unseen: 0, need: 10 });
    expect(plan.categories[0].reason).toBe('10 missed questions to re-answer');
  });

  it('gives heavier categories more of the day for the same work, and the parts add up', () => {
    const plan = examPlan(day(20), [row(1, 10, 0, 0, 50, null), row(2, 25, 0, 0, 50, null), row(3, 65, 0, 0, 50, null)], 5, NOW)!;
    expect(plan.categories.map(c => c.domain)).toEqual([3, 2, 1]);
    expect(plan.categories.reduce((s, c) => s + c.today, 0)).toBe(plan.daily);
  });

  it('explains each category in words', () => {
    const plan = examPlan(day(20), [row(1, 50, 2, 1, 50, null), row(2, 50, 10, 6, 50, 60)], 5, NOW)!;
    const reasons = Object.fromEntries(plan.categories.map(c => [c.domain, c.reason]));
    expect(reasons[1]).toBe('3 more answers before it can be scored (5 needed)');
    expect(reasons[2]).toBe('at 60%, below the 85% target');
  });

  it('schedules mocks weekly while learning, closer together near the end, and a last one two days out', () => {
    const far = examPlan(day(30), [], 5, NOW)!;
    expect(far).toMatchObject({ phase: 'learn', nextMock: day(7), finalMock: day(28) });
    const near = examPlan(day(10), [], 5, NOW)!;
    expect(near).toMatchObject({ phase: 'review', nextMock: day(3), finalMock: day(8) });
    const close = examPlan(day(4), [], 5, NOW)!;
    expect(close).toMatchObject({ nextMock: day(2), finalMock: day(2) });
    expect(examPlan(day(2), [], 5, NOW)).toMatchObject({ phase: 'final', nextMock: null, finalMock: null });
  });

  it('stops planning on exam day and afterwards', () => {
    expect(examPlan(day(0), [row(1, 100, 0, 0, 100, null)], 5, NOW)).toMatchObject({ phase: 'today', daily: 0 });
    expect(examPlan(day(-3), [row(1, 100, 0, 0, 100, null)], 5, NOW)).toMatchObject({ phase: 'past', daily: 0 });
  });

  it('plans from the real readiness rows for both blueprints', () => {
    for (const blueprint of ['nse', 'network-plus'] as const) {
      const plan = examPlan(day(21), examReadiness([], blueprint).rows, READINESS_MIN_ANSWERS, NOW)!;
      expect(plan.categories.length).toBeGreaterThanOrEqual(5);
      expect(plan.daily).toBeGreaterThanOrEqual(MIN_DAILY);
      expect(plan.categories.every(c => c.toScore === READINESS_MIN_ANSWERS)).toBe(true);
    }
  });

  it('imports no question data, so Study Home can use it without growing the first bundle', () => {
    const source = readFileSync(path.join(__dirname, 'examPlan.ts'), 'utf8');
    expect(source.match(/^import .*$/gm)).toEqual(["import type { Track } from './types';"]);
  });
});
