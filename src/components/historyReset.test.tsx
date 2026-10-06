import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
Object.assign(globalThis, { window: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} } });
const { default: PracticeQuiz } = await import('./PracticeQuiz');
const { studyQuestions } = await import('../engine/catalog');
const { eraseConfirmation, restoreErased } = await import('../engine/historyReset');

const queue = studyQuestions.filter(q => !q.variant && (q.type ?? 'standard') === 'standard').slice(0, 3);
const answered = (q: typeof queue[number]) => ({ questionId: q.id, selectedAnswers: [q.correctAnswers[0]], explanation: 'x', topic: q.topic, isCorrect: true });
const render = (history: object[]) => {
  memory.set('watchguard-quiz-session-v2', JSON.stringify({ mode: 'practice', filters: { topic: 'All', track: 'local', content: 'mixed' }, queue, index: 0,
    current: queue[0], selected: [], evaluation: null, history, seen: [queue[0].id], examStart: 0, complete: false }));
  return renderToStaticMarkup(<PracticeQuiz onScoreUpdated={() => {}}/>).replace(/<!-- -->/g, '');
};

describe('erasing answer history', () => {
  it('lives in Practice settings, not beside Check answer', () => {
    const html = render([answered(queue[0]), answered(queue[1])]);
    const actions = html.match(/<div class="question-actions">[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(actions).toContain('Check answer');
    expect(actions).not.toMatch(/Erase|Reset/);
    const settings = html.match(/<details class="quiz-filter-drawer">[\s\S]*?<\/details>/)?.[0] ?? '';
    expect(settings).toContain('Erase answer history');
    expect(settings).toContain('2 answers on all tracks');
  });

  it('cannot be pressed with nothing to erase', () => {
    expect(render([])).toMatch(/<button class="secondary-button" disabled="">[\s\S]{0,400}Erase answer history/);
  });

  it('asks first, naming how much is lost and that other devices follow', () => {
    const text = eraseConfirmation(42);
    expect(text).toContain('Erase all 42 answers on all three tracks?');
    expect(text).toContain('other devices');
    expect(text).toContain('undo');
    expect(eraseConfirmation(1)).toContain('Erase all 1 answer on');
  });

  it('undo keeps answers given after the erase', () => {
    const before = [answered(queue[0]), answered(queue[1])];
    const since = [answered(queue[2])];
    expect(restoreErased(before, since)).toEqual([...before, ...since]);
  });
});
