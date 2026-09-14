import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { filterQuestions } from '../../engine/catalog';
import { examReadiness, READINESS_MIN_ANSWERS } from '../../engine/mockExam';
import { nseCategory } from '../../data/nseBlueprint';
import { NETWORK_PLUS_DOMAIN } from '../../data/networkPlusBlueprint';
import ExamReadiness from './ExamReadiness';
import WeaknessTracker, { topicStandings } from './WeaknessTracker';
import OverviewStats from './OverviewStats';

const local = filterQuestions({ track: 'local' }).filter(q => !q.variant);
const inCategory = (c: number) => local.filter(q => nseCategory(q) === c);
const answer = (id: number, isCorrect: boolean, topic = 'NAT') => ({ questionId: id, isCorrect, topic, selectedAnswers: [], explanation: '' });

/** Five answers in every NSE category; `right[c]` of them correct. */
function fiveEach(right: Record<number, number>) {
  return [1, 2, 3, 4, 5, 6].flatMap(c => inCategory(c).slice(0, 5).map((q, i) => answer(q.id, i < right[c], q.topic)));
}

describe('exam readiness', () => {
  it('shows no scores or estimate before anything is answered, and points at the heaviest category', () => {
    const r = examReadiness([], 'nse');
    expect(r.passMark).toBe(75);
    expect(r.rows.map(row => row.score)).toEqual([null, null, null, null, null, null]);
    expect(r.estimate).toBeNull();
    expect(r.focus?.weight).toBe(25);
  });

  it('counts every Local Firebox question in the bank towards one category', () => {
    const r = examReadiness([], 'nse');
    expect(r.rows.reduce((sum, row) => sum + row.available, 0)).toBe(filterQuestions({ track: 'local' }).length);
  });

  it('counts each question once, by its most recent answer', () => {
    const q = inCategory(1)[0];
    const r = examReadiness([answer(q.id, false), answer(q.id, false), answer(q.id, true)], 'nse');
    expect(r.rows[0]).toMatchObject({ answered: 1, correct: 1, score: null });
  });

  it(`withholds a category score until ${READINESS_MIN_ANSWERS} questions are answered`, () => {
    const qs = inCategory(6);
    const four = qs.slice(0, READINESS_MIN_ANSWERS - 1).map(q => answer(q.id, true));
    expect(examReadiness(four, 'nse').rows[5].score).toBeNull();
    expect(examReadiness([...four, answer(qs[4].id, false)], 'nse').rows[5].score).toBe(80);
  });

  it('weights the estimate by the published outline and focuses on the largest gap', () => {
    const r = examReadiness(fiveEach({ 1: 5, 2: 5, 3: 5, 4: 3, 5: 4, 6: 5 }), 'nse');
    // (10+10+15)*100 + 25*60 + 25*80 + 15*100, over 100.
    expect(r.estimate).toBe(85);
    expect(r.focus?.name).toBe('Networking and NAT');
  });

  it('keeps Network+ separate and claims no percentage pass mark for it', () => {
    const r = examReadiness(fiveEach({ 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5 }), 'network-plus');
    expect(r.passMark).toBeUndefined();
    expect(r.unit).toBe('domain');
    expect(r.rows.every(row => row.answered === 0)).toBe(true);
    const id = Number(Object.keys(NETWORK_PLUS_DOMAIN)[0]);
    expect(examReadiness([answer(id, true)], 'network-plus').rows[NETWORK_PLUS_DOMAIN[id] - 1].answered).toBe(1);
  });

  it('tells the learner what is missing, then how far from the pass mark they are', () => {
    expect(renderToStaticMarkup(<ExamReadiness history={[]} />))
      .toContain('Answer at least 5 questions in every category for an overall estimate. 0 of 6 categories have enough so far.');
    const passing = renderToStaticMarkup(<ExamReadiness history={fiveEach({ 1: 5, 2: 5, 3: 5, 4: 3, 5: 4, 6: 5 })} />);
    expect(passing).toContain('<strong>85%</strong> weighted by the exam outline. The exam needs 75%, so you are on track.');
    expect(passing).toContain('Study next: <strong>Networking and NAT</strong>, worth 25% of the exam, where you are at 60%.');
    const failing = renderToStaticMarkup(<ExamReadiness history={fiveEach({ 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 })} />);
    expect(failing).toContain('The exam needs 75%, so you are 15 points short.');
  });
});

describe('topics to review', () => {
  const nat = local.filter(q => q.topic === 'NAT').slice(0, 4);
  const bovpn = local.filter(q => q.topic === 'BOVPN').slice(0, 2);

  it('uses the latest answer per question on the current track, weakest first', () => {
    const history = [
      ...nat.map(q => answer(q.id, false, 'NAT')),
      answer(nat[0].id, true, 'NAT'),
      ...bovpn.map(q => answer(q.id, true, 'BOVPN')),
    ];
    expect(topicStandings(history, 'local')).toEqual([
      { topic: 'NAT', correct: 1, total: 4, percent: 25 },
      { topic: 'BOVPN', correct: 2, total: 2, percent: 100 },
    ]);
    expect(topicStandings(history, 'network-plus')).toEqual([]);
  });

  it('lists only topics with enough answers that fall below 75%, in plain language', () => {
    const history = [...nat.map(q => answer(q.id, false, 'NAT')), ...bovpn.map(q => answer(q.id, false, 'BOVPN'))];
    const html = renderToStaticMarkup(<WeaknessTracker history={history} />);
    expect(html).toContain('0 of 4 right · 0%');
    expect(html).not.toContain('BOVPN');
    expect(html).not.toMatch(/remediation|vulnerabilit/i);
    expect(renderToStaticMarkup(<WeaknessTracker history={[]} />)).toContain('Answer practice questions on this track');
  });
});

describe('overview stats', () => {
  it('reports questions answered without a wrapping "x / y Correct" figure', () => {
    const html = renderToStaticMarkup(<OverviewStats score="50%" completedLabs={[]} history={[answer(local[0].id, true), answer(local[1].id, false)]} />);
    expect(html).toContain('Questions answered');
    expect(html).toContain('1 answered correctly');
    expect(html).not.toContain('Correct</div>');
  });
});
