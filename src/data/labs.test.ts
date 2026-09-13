import { describe, expect, it } from 'vitest';
import { watchguardLabs, labCategories, orderLabs } from './labs';
import { buildStudyReport } from '../engine/progress';

/**
 * The catalogue previously held 8 of the 20 Lab Book exercises, numbered 1, 6, 8, 11, 14, 15, 12,
 * 13 - gaps, and the last two out of order in the array the UI rendered directly. These assertions
 * are what stop that recurring: the set has to be complete, contiguous and sorted, and every lab a
 * progress report recommends has to exist.
 */
describe('lab catalogue', () => {
  it('covers all twenty Lab Book exercises, contiguous and in order', () => {
    expect(watchguardLabs).toHaveLength(20);
    expect(watchguardLabs.map(l => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('gives every lab the fields the catalogue browses by', () => {
    for (const lab of watchguardLabs) {
      expect(lab.name, `lab ${lab.id} name`).toMatch(new RegExp(`^Lab ${lab.id}: `));
      expect(labCategories, `lab ${lab.id} category`).toContain(lab.category);
      expect(typeof lab.requiresExtraKit, `lab ${lab.id} kit flag`).toBe('boolean');
      expect(lab.objectives.length, `lab ${lab.id} objectives`).toBeGreaterThan(40);
      // "None." is a real answer for a lab that stands alone, so this only asserts it is stated.
      expect(lab.prerequisites.trim().length, `lab ${lab.id} prerequisites`).toBeGreaterThan(0);
      expect(lab.steps.length, `lab ${lab.id} steps`).toBeGreaterThanOrEqual(3);
      expect(lab.steps.map(s => s.stepNumber)).toEqual(lab.steps.map((_, i) => i + 1));
      for (const step of lab.steps) {
        expect(step.title.trim().length, `lab ${lab.id} step title`).toBeGreaterThan(0);
        // A walkthrough step that does not say what to do is not a walkthrough step.
        expect(step.instruction.length, `lab ${lab.id} step ${step.stepNumber}`).toBeGreaterThan(40);
      }
    }
  });

  it('keeps every category populated so filtering never offers an empty option', () => {
    for (const category of labCategories) {
      expect(watchguardLabs.filter(l => l.category === category).length, category).toBeGreaterThan(0);
    }
  });

  it('leaves a majority of labs runnable with a single Firebox', () => {
    // The kit flag is only useful if it actually separates the catalogue; if everything needed a
    // second appliance the filter would be a dead control.
    const runnable = watchguardLabs.filter(l => !l.requiresExtraKit);
    expect(runnable.length).toBeGreaterThan(watchguardLabs.length / 2);
    expect(runnable.length).toBeLessThan(watchguardLabs.length);
  });

  it('recommends only labs that exist', () => {
    const ids = new Set(watchguardLabs.map(l => l.id));
    const names = new Set(watchguardLabs.map(l => l.name));
    const topics = ['Initial Setup', 'Policies', 'NAT', 'Routing', 'BOVPN', 'Mobile VPN', 'Proxies',
      'Security Services', 'Switching & Wireless', 'Troubleshooting', 'Logging & Monitoring',
      'WatchGuard Cloud', 'IP Addressing', 'Network Services', 'Network Operations'];
    for (const topic of topics) {
      const report = buildStudyReport({ history: [{ topic, isCorrect: false }] });
      expect(report.recommendedLabs.length, `${topic} has no lab recommendation`).toBeGreaterThan(0);
      for (const name of report.recommendedLabs) expect(names, `${topic} -> ${name}`).toContain(name);
    }
    expect(ids.size).toBe(watchguardLabs.length);
  });
});

describe('catalogue browsing', () => {
  const all = { sortBy: 'number' as const, category: 'All' as const, singleFireboxOnly: false };

  it('sorts by lab number by default, which is the Lab Book order', () => {
    // Shuffled input, because the bug this replaces was the component rendering source order.
    const shuffled = [...watchguardLabs].reverse();
    expect(orderLabs(shuffled, all).map(l => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('groups by category and keeps lab number as the tiebreak inside each group', () => {
    const ordered = orderLabs(watchguardLabs, { ...all, sortBy: 'category' });
    expect(ordered).toHaveLength(watchguardLabs.length);
    const categories = ordered.map(l => l.category);
    expect([...categories].sort()).toEqual(categories);
    for (const category of labCategories) {
      const ids = ordered.filter(l => l.category === category).map(l => l.id);
      expect([...ids].sort((a, b) => a - b), category).toEqual(ids);
    }
  });

  it('sorts by name without dropping or duplicating a lab', () => {
    const ordered = orderLabs(watchguardLabs, { ...all, sortBy: 'name' });
    expect(new Set(ordered.map(l => l.id)).size).toBe(watchguardLabs.length);
  });

  it('filters to one category', () => {
    const ordered = orderLabs(watchguardLabs, { ...all, category: 'VPN' });
    expect(ordered.length).toBeGreaterThan(0);
    expect(ordered.every(l => l.category === 'VPN')).toBe(true);
  });

  it('hides labs that need more than one Firebox when asked', () => {
    const ordered = orderLabs(watchguardLabs, { ...all, singleFireboxOnly: true });
    expect(ordered.every(l => !l.requiresExtraKit)).toBe(true);
    expect(ordered.length).toBe(watchguardLabs.filter(l => !l.requiresExtraKit).length);
  });

  it('returns nothing rather than everything when filters exclude all labs', () => {
    // The catalogue renders an explicit empty state for this, so it must not silently fall back.
    const ordered = orderLabs(watchguardLabs, { ...all, category: 'Authentication', singleFireboxOnly: true });
    expect(ordered.every(l => l.category === 'Authentication' && !l.requiresExtraKit)).toBe(true);
    expect(orderLabs([], all)).toEqual([]);
  });

  it('never mutates the array it is given', () => {
    const before = watchguardLabs.map(l => l.id);
    orderLabs(watchguardLabs, { ...all, sortBy: 'name' });
    expect(watchguardLabs.map(l => l.id)).toEqual(before);
  });
});
