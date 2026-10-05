import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
Object.assign(globalThis, { window: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} } });
const { default: PracticeQuiz } = await import('./PracticeQuiz');
const { studyQuestions } = await import('../engine/catalog');
const { validStudyValue } = await import('../account/schema');

const queue = studyQuestions.filter(q => !q.variant && (q.type ?? 'standard') === 'standard').slice(0, 4);
const MIN = 60_000;
const answered = (q: typeof queue[number], isCorrect: boolean) => ({ attemptId: 'a' + q.id, questionId: q.id, question: q.question, options: q.options,
  correctAnswers: q.correctAnswers, selectedAnswers: [q.correctAnswers[0]], explanation: 'x', topic: q.topic, isCorrect, answeredAt: new Date().toISOString() });
const session = (extra: object) => ({ mode: 'mock-exam', filters: { topic: 'All', track: 'local', content: 'mixed' }, queue, index: 0, current: queue[0],
  selected: [], evaluation: null, history: [], seen: [queue[0].id], examStart: 0, complete: false, ...extra });
const render = (s: object) => {
  memory.set('watchguard-quiz-session-v2', JSON.stringify(s));
  return renderToStaticMarkup(<PracticeQuiz onScoreUpdated={() => {}}/>).replace(/<!-- -->/g, '');
};

describe('timed mock exam', () => {
  it('shows the clock and pace while a timed exam runs', () => {
    const html = render(session({ timing: { startedAt: Date.now() - MIN, deadline: Date.now() + 3 * MIN } }));
    expect(html).toMatch(/role="timer" aria-label="3:0\d left"/);
    expect(html).toMatch(/exam-clock is-(on-pace|behind)/);
    expect(html).toContain('checked=""');
  });

  it('shows no clock on an untimed mock exam', () => {
    expect(render(session({}))).not.toContain('role="timer"');
  });

  it('scores a timed-out exam out of every question, and says why', () => {
    const s = session({ index: 1, current: null, complete: true, history: [answered(queue[0], true)],
      timing: { startedAt: Date.now() - 4 * MIN, deadline: Date.now(), endedAt: Date.now(), timedOut: true } });
    const html = render(s);
    expect(html).toContain('1 of 4 correct · 25%');
    expect(html).toContain('Time ran out with 3 of 4 questions unanswered.');
  });

  it('reports the time used on an exam finished early', () => {
    const start = Date.now() - 2 * MIN;
    const html = render(session({ index: 4, current: null, complete: true, history: queue.map(q => answered(q, true)),
      timing: { startedAt: start, deadline: start + 4 * MIN, endedAt: start + 2 * MIN } }));
    expect(html).toContain('4 of 4 correct · 100%');
    expect(html).toContain('Finished in 2:00 of 4:00, with 2:00 to spare.');
  });

  it('lets the server store a timed session and rejects a malformed timer', () => {
    const ok = session({ timing: { startedAt: 1, deadline: 2 } });
    expect(validStudyValue('watchguard-quiz-session-v2', JSON.stringify(ok))).toBe(true);
    expect(validStudyValue('watchguard-quiz-session-v2', JSON.stringify(session({ timing: { startedAt: 5, deadline: 'soon' } })))).toBe(false);
  });
});
