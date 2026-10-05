import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
const { default: ExamPlanner } = await import('./ExamPlanner');
const { isoDay, EXAM_PLAN_KEY } = await import('../../engine/examPlan');
const render = () => renderToStaticMarkup(<ExamPlanner history={[]} />).replace(/<!-- -->/g, '');

describe('exam planner card', () => {
  it('asks for the exam date when there is none', () => {
    memory.clear();
    const html = render();
    expect(html).toContain('When do you sit Network Security Essentials?');
    expect(html).toContain('type="date"');
  });

  it('turns a saved date into a countdown, a daily target split by category, and mock dates', () => {
    const exam = new Date(); exam.setDate(exam.getDate() + 30);
    memory.set(EXAM_PLAN_KEY, JSON.stringify({ local: isoDay(exam) }));
    const html = render();
    expect(html).toContain('30 days</strong> to go.');
    expect(html).toContain('Learning phase');
    expect(html).toMatch(/Today: answer <strong>\d+ questions<\/strong>, aiming for 85% in every category\./);
    expect(html).toContain('Networking and NAT</strong> · 5 more answers before it can be scored (5 needed)');
    expect(html).toContain('Next mock exam:');
    expect(html).toContain('Last full mock:');
  });

  it('ignores a malformed saved value instead of failing', () => {
    memory.set(EXAM_PLAN_KEY, '{"local":"next tuesday"}');
    expect(render()).toContain('type="date"');
  });
});
