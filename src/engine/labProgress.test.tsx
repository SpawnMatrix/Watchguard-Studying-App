import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { watchguardLabs } from '../data/labs';
import { labCheckpoints } from '../data/labCheckpoints';
import { validateSnapshot, STUDY_KEYS } from '../account/schema';
import { entryFor, furthestReachable, isLabFinished, LAB_PROGRESS_KEY, markStepDone, resetLab, setResumeStep, validLabProgress, type LabProgress } from './labProgress';
import LabCheckpointCard from '../components/LabCheckpointCard';

const lab = watchguardLabs.find(l => l.id === 1)!; // five steps

describe('lab step progress', () => {
  it('starts empty, advances as steps are passed, and finishes on the last one', () => {
    let p: LabProgress = {};
    expect(entryFor(p, lab)).toEqual({ done: [], step: 0 });
    for (let i = 0; i < lab.steps.length; i++) {
      expect(isLabFinished(p, lab)).toBe(false);
      p = markStepDone(p, lab, i);
    }
    expect(entryFor(p, lab)).toEqual({ done: [0, 1, 2, 3, 4], step: 4 });
    expect(isLabFinished(p, lab)).toBe(true);
  });

  it('only lets a learner open passed steps and the next one', () => {
    let p: LabProgress = {};
    expect(furthestReachable(p, lab)).toBe(0);
    p = markStepDone(p, lab, 0);
    p = markStepDone(p, lab, 1);
    expect(furthestReachable(p, lab)).toBe(2);
    // Revisiting an earlier step moves the resume point but never un-passes anything.
    p = setResumeStep(p, lab, 0);
    expect(entryFor(p, lab)).toEqual({ done: [0, 1], step: 0 });
    expect(furthestReachable(p, lab)).toBe(2);
  });

  it('is idempotent and keeps other labs untouched', () => {
    const other = watchguardLabs.find(l => l.id === 2)!;
    let p = markStepDone({}, other, 0);
    p = markStepDone(p, lab, 3);
    p = markStepDone(p, lab, 3);
    expect(entryFor(p, lab).done).toEqual([3]);
    expect(entryFor(p, other).done).toEqual([0]);
    expect(entryFor(resetLab(p, lab), lab)).toEqual({ done: [], step: 0 });
    expect(entryFor(resetLab(p, lab), other).done).toEqual([0]);
  });

  it('never resumes past the end of a lab whose saved progress is out of range', () => {
    const p: LabProgress = { '1': { done: [0, 7, 9], step: 30 } };
    expect(entryFor(p, lab)).toEqual({ done: [0], step: 4 });
  });
});

describe('lab progress syncs with accounts safely', () => {
  it('is a synchronised study key that the server validates', () => {
    expect(STUDY_KEYS).toContain(LAB_PROGRESS_KEY);
    const good = JSON.stringify({ '1': { done: [0, 1], step: 2 }, '16': { done: [], step: 0 } });
    expect(validateSnapshot({ [LAB_PROGRESS_KEY]: good })).toEqual({ [LAB_PROGRESS_KEY]: good });
  });

  it('rejects malformed or oversized progress before it can replace a valid snapshot', () => {
    for (const bad of [
      '[]', 'null', '{"x":{"done":[],"step":0}}', '{"1":{"done":[-1],"step":0}}', '{"1":{"done":[0.5],"step":0}}',
      '{"1":{"done":[],"step":-1}}', '{"1":{"done":"0","step":0}}', '{"1":{"step":0}}', '{"1000":{"done":[],"step":0}}',
      JSON.stringify({ '1': { done: Array.from({ length: 51 }, (_, i) => i % 50), step: 0 } }),
    ]) {
      expect(() => validateSnapshot({ [LAB_PROGRESS_KEY]: bad }), bad).toThrow();
    }
    expect(validLabProgress({})).toBe(true);
  });
});

describe('checkpoint card', () => {
  const checkpoint = labCheckpoints['6.3'];

  it('shows the question and all options, in a stable order for a given step', () => {
    const first = renderToStaticMarkup(<LabCheckpointCard checkpoint={checkpoint} seed={603} attempt={null} passedEarlier={false} onAnswer={() => {}} onRetry={() => {}} />);
    const again = renderToStaticMarkup(<LabCheckpointCard checkpoint={checkpoint} seed={603} attempt={null} passedEarlier={false} onAnswer={() => {}} onRetry={() => {}} />);
    expect(first).toBe(again);
    expect(first).toContain(checkpoint.question);
    for (const option of checkpoint.options) expect(first).toContain(option);
    expect(first).not.toContain(checkpoint.why);
  });

  it('explains a wrong answer and offers a retry without revealing which option is right', () => {
    const wrong = checkpoint.options[1];
    const html = renderToStaticMarkup(<LabCheckpointCard checkpoint={checkpoint} seed={603} attempt={{ choice: wrong, correct: false }} passedEarlier={false} onAnswer={() => {}} onRetry={() => {}} />);
    expect(html).toContain('Not quite');
    expect(html).toContain('Try again');
    expect(html).toContain(checkpoint.why);
    expect(html.match(/is-correct/g)).toBeNull();
  });

  it('confirms a correct answer', () => {
    const html = renderToStaticMarkup(<LabCheckpointCard checkpoint={checkpoint} seed={603} attempt={{ choice: checkpoint.answer, correct: true }} passedEarlier onAnswer={() => {}} onRetry={() => {}} />);
    expect(html).toContain('Correct. This step is ready to complete.');
    expect(html).not.toContain('Try again');
  });
});

describe('lab walkthrough wiring', () => {
  const walkthrough = readFileSync(path.join(__dirname, '../components/LabWalkthrough.tsx'), 'utf8');
  const app = readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');

  it('requires the checkpoint, and on hands-on steps the simulator task, before a step can be completed', () => {
    expect(walkthrough).toContain('const canComplete = (!checkpoint || stepDone || !!attempt?.correct) && (!task || stepDone || taskDone);');
    expect(walkthrough).toMatch(/disabled=\{!canComplete\}/);
  });

  it('puts the completion button first in the footer, so a narrow window cannot hide it', () => {
    const footer = walkthrough.slice(walkthrough.indexOf('Step Completion Footer'));
    expect(footer.indexOf('onClick={handleStepComplete}')).toBeLessThan(footer.indexOf('Previous step'));
    expect(footer).toMatch(/flex flex-wrap items-center gap-3/);
  });

  it('keeps the learner on the lab when it is finished instead of jumping to the admin tab', () => {
    const handler = app.slice(app.indexOf('const handleLabCompleted'), app.indexOf('const handleProfileSave'));
    expect(handler).not.toMatch(/setActiveTab\("admin"\)/);
    expect(app).toMatch(/<LabWalkthrough onLabCompleted=\{handleLabCompleted\} completedLabs=\{completedLabs\} \/>/);
  });
});
