import { describe, expect, it } from 'vitest';
import { labCheckpoints, checkpointFor } from './labCheckpoints';
import { watchguardLabs } from './labs';

const all = Object.entries(labCheckpoints);

describe('lab checkpoints', () => {
  it('gives every lab step exactly one checkpoint, and nothing else', () => {
    const steps = watchguardLabs.flatMap(lab => lab.steps.map(step => `${lab.id}.${step.stepNumber}`));
    expect(Object.keys(labCheckpoints).sort()).toEqual([...steps].sort());
    for (const lab of watchguardLabs) for (const step of lab.steps) {
      expect(checkpointFor(lab.id, step.stepNumber), `${lab.name} step ${step.stepNumber}`).toBeDefined();
    }
  });

  it('has four distinct options including the answer, and an explanation worth reading', () => {
    for (const [key, c] of all) {
      expect(c.options, key).toHaveLength(4);
      expect(c.options[0], key).toBe(c.answer);
      expect(new Set(c.options.map(o => o.toLowerCase())).size, `${key} repeats an option`).toBe(4);
      expect(c.why.length, `${key} explanation`).toBeGreaterThan(60);
      expect(c.question.endsWith('?'), `${key} question`).toBe(true);
    }
  });

  it('does not give the answer away by length', () => {
    // The authored bank once had the correct option as the longest 66% of the time. Checkpoints are
    // measured the same way: only where options are long enough for length to be noticeable, and
    // flagging both directions, because an answer that is never the longest is a tell too.
    const measured = all.filter(([, c]) => Math.max(...c.options.map(o => o.length)) >= 25);
    const longest = measured.filter(([, c]) => c.answer.length === Math.max(...c.options.map(o => o.length))).length;
    const share = longest / measured.length;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.35);
    for (const [key, c] of measured) {
      const gap = c.answer.length - Math.max(...c.options.slice(1).map(o => o.length));
      expect(gap, `${key}: answer is visibly longer than every distractor`).toBeLessThanOrEqual(4);
    }
  });

  it('keeps answers consistent with the addresses the lab steps actually use', () => {
    // Spot checks where a typo would teach the wrong value.
    const instruction = (labId: number, step: number) => watchguardLabs.find(l => l.id === labId)!.steps[step - 1].instruction;
    expect(instruction(1, 1)).toContain(labCheckpoints['1.1'].answer);
    expect(instruction(7, 1)).toContain(labCheckpoints['7.1'].answer);
    expect(instruction(7, 2)).toContain(labCheckpoints['7.2'].answer);
    expect(instruction(8, 3)).toContain(labCheckpoints['8.3'].answer);
    expect(instruction(13, 4)).toContain(labCheckpoints['13.4'].answer);
    expect(instruction(16, 1)).toContain(labCheckpoints['16.1'].answer);
    expect(instruction(16, 3)).toContain(labCheckpoints['16.3'].answer);
    expect(instruction(17, 1)).toContain(labCheckpoints['17.1'].answer);
  });
});
