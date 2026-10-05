import { describe, expect, it } from 'vitest';
import { SECONDS_PER_QUESTION, announcement, formatClock, isExpired, pace, remainingMs, startTiming, usedMs, validTiming } from './examTimer';

const T0 = 1_800_000_000_000;
const MIN = 60_000;

describe('mock exam timer', () => {
  it('allows one minute per question from the moment it starts', () => {
    const t = startTiming(50, T0);
    expect(SECONDS_PER_QUESTION).toBe(60);
    expect(t.deadline - t.startedAt).toBe(50 * MIN);
    expect(remainingMs(t, T0 + 10 * MIN)).toBe(40 * MIN);
    expect(usedMs(t, T0 + 10 * MIN)).toBe(10 * MIN);
  });

  it('expires at the deadline, and freezes both clocks once the exam has ended', () => {
    const t = startTiming(10, T0);
    expect(isExpired(t, T0 + 10 * MIN - 1)).toBe(false);
    expect(isExpired(t, T0 + 10 * MIN)).toBe(true);
    const finished = { ...t, endedAt: T0 + 7 * MIN };
    expect(isExpired(finished, T0 + 60 * MIN)).toBe(false);
    expect(remainingMs(finished, T0 + 60 * MIN)).toBe(3 * MIN);
    expect(usedMs(finished, T0 + 60 * MIN)).toBe(7 * MIN);
    expect(usedMs(t, T0 + 99 * MIN)).toBe(10 * MIN);
  });

  it('formats a clock that only reads 0:00 when time is really up', () => {
    expect(formatClock(50 * MIN)).toBe('50:00');
    expect(formatClock(61_000)).toBe('1:01');
    expect(formatClock(500)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(90 * MIN)).toBe('1:30:00');
  });

  it('reports pace with a question of slack either way', () => {
    const t = startTiming(50, T0);
    expect(pace(t, 10, 50, T0 + 10 * MIN)).toBe('on pace');
    expect(pace(t, 11, 50, T0 + 10 * MIN)).toBe('on pace');
    expect(pace(t, 12, 50, T0 + 10 * MIN)).toBe('ahead');
    expect(pace(t, 8, 50, T0 + 10 * MIN)).toBe('behind');
  });

  it('names the last of the five- and one-minute marks crossed, which the UI speaks once', () => {
    expect(announcement(20 * MIN)).toBeNull();
    expect(announcement(5 * MIN + 1)).toBeNull();
    expect(announcement(5 * MIN)).toBe('Five minutes left.');
    expect(announcement(4 * MIN + 30_000)).toBe('Five minutes left.');
    expect(announcement(MIN)).toBe('One minute left.');
    expect(announcement(0)).toBeNull();
  });

  it('validates the timing saved with a session', () => {
    expect(validTiming(startTiming(5, T0))).toBe(true);
    expect(validTiming({ ...startTiming(5, T0), endedAt: T0 + 1, timedOut: true })).toBe(true);
    for (const bad of [null, [], {}, { startedAt: T0, deadline: T0 }, { startedAt: T0, deadline: 'later' }, { ...startTiming(5, T0), timedOut: 'yes' }])
      expect(validTiming(bad), JSON.stringify(bad)).toBe(false);
  });
});
