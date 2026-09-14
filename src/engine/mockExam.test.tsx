import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createExam, filterQuestions } from './catalog';
import { blueprintQuotas, createBlueprintExam, createMockExam, domainResults, examResults } from './mockExam';
import { nseCategory } from '../data/nseBlueprint';
import { NETWORK_PLUS_DOMAIN, type NetworkPlusDomain } from '../data/networkPlusBlueprint';
import DomainBreakdown from '../components/DomainBreakdown';

const count = (questions: readonly { id: number }[]) => {
  const tally: Record<NetworkPlusDomain, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const q of questions) tally[NETWORK_PLUS_DOMAIN[q.id]]++;
  return tally;
};

describe('blueprint quotas', () => {
  it('gives a 50-question mock the N10-009 split', () => {
    expect(blueprintQuotas(50)).toEqual({ 1: 12, 2: 10, 3: 9, 4: 7, 5: 12 });
  });

  it('always sums to the exam size', () => {
    for (let size = 1; size <= 120; size++) {
      const quotas = blueprintQuotas(size);
      expect(Object.values(quotas).reduce((a, b) => a + b, 0), `size ${size}`).toBe(size);
    }
  });
});

describe('Network+ mock exams', () => {
  const pool = filterQuestions({ track: 'network-plus' });

  it('draws exactly the blueprint from every domain, whatever the seed', () => {
    // The uniform draw this replaces gave Network Security anywhere from 1 to 16 questions.
    for (let seed = 1; seed <= 300; seed++) {
      const exam = createMockExam(pool, seed);
      expect(exam).toHaveLength(50);
      expect(count(exam), `seed ${seed}`).toEqual({ 1: 12, 2: 10, 3: 9, 4: 7, 5: 12 });
    }
  });

  it('never repeats an authored question and stays on the Network+ track', () => {
    for (const seed of [3, 71, 9001]) {
      const exam = createMockExam(pool, seed);
      const authored = exam.filter(q => !q.variant).map(q => q.id);
      expect(new Set(authored).size).toBe(authored.length);
      expect(exam.every(q => q.track === 'network-plus')).toBe(true);
    }
  });

  it('is reproducible for a seed, like the uniform exam', () => {
    expect(createMockExam(pool, 4321)).toEqual(createMockExam(pool, 4321));
    expect(createMockExam(pool, 4321)).not.toEqual(createMockExam(pool, 4322));
  });

  it('interleaves domains rather than serving them in blocks', () => {
    const domains = createMockExam(pool, 12).map(q => NETWORK_PLUS_DOMAIN[q.id]);
    const changes = domains.filter((d, i) => i > 0 && d !== domains[i - 1]).length;
    expect(changes).toBeGreaterThan(20);
  });

  it('keeps the blueprint when only authored questions are selected', () => {
    const authored = filterQuestions({ track: 'network-plus', content: 'authored' });
    expect(count(createMockExam(authored, 5))).toEqual({ 1: 12, 2: 10, 3: 9, 4: 7, 5: 12 });
  });
});

describe('pools with no blueprint to honour keep the uniform draw', () => {
  const cases = [
    ['WatchGuard Cloud track', { track: 'cloud' as const }],
    ['All tracks', { track: 'all' as const }],
    ['one Network+ topic', { track: 'network-plus' as const, topic: 'Routing' }],
    ['one Local Firebox topic', { track: 'local' as const, topic: 'NAT' }],
    ['Local Firebox generated only, which has no Basics template', { track: 'local' as const, content: 'generated' as const }],
    ['Network+ generated only, which has no Security template', { track: 'network-plus' as const, content: 'generated' as const }],
    ['Network+ diagrams only', { track: 'network-plus' as const, format: 'topology' as const }],
  ] as const;

  for (const [label, filters] of cases) {
    it(label, () => {
      const pool = filterQuestions(filters);
      expect(createBlueprintExam(pool, 99)).toBeNull();
      expect(createMockExam(pool, 99)).toEqual(createExam(pool, 99));
    });
  }

  it('returns an empty exam for an empty pool', () => {
    expect(createMockExam([], 1)).toEqual([]);
  });
});

describe('score by domain', () => {
  const pool = filterQuestions({ track: 'network-plus' });

  it('reports each domain from a finished Network+ mock', () => {
    const exam = createMockExam(pool, 8);
    // Answer every Security question wrong and everything else right.
    const history = exam.map(q => ({ questionId: q.id, isCorrect: NETWORK_PLUS_DOMAIN[q.id] !== 4 }));
    const rows = domainResults(history);
    expect(rows.map(r => [r.domain, r.correct, r.total])).toEqual([[1, 12, 12], [2, 10, 10], [3, 9, 9], [4, 0, 7], [5, 12, 12]]);

    const html = renderToStaticMarkup(<DomainBreakdown history={history} />);
    expect(html).toContain('Score by exam domain');
    expect(html).toContain('0/7');
    expect(html).toMatch(/Weakest in this attempt: <strong>Network Security<\/strong>, worth 14%/);
  });

  it('shows nothing for a mock that belongs to no published blueprint', () => {
    const cloud = createMockExam(filterQuestions({ track: 'cloud' }), 8);
    const history = cloud.map(q => ({ questionId: q.id, isCorrect: true }));
    expect(domainResults(history)).toEqual([]);
    expect(renderToStaticMarkup(<DomainBreakdown history={history} />)).toBe('');
    expect(domainResults([])).toEqual([]);
  });

  it('does not single out a weakest domain when every domain scored the same', () => {
    const history = createMockExam(pool, 2).map(q => ({ questionId: q.id, isCorrect: true }));
    expect(renderToStaticMarkup(<DomainBreakdown history={history} />)).not.toContain('Weakest');
  });
});

describe('quiz engine wiring', () => {
  it('builds mock exams through the blueprint-aware builder', () => {
    const source = readFileSync(path.join(__dirname, 'useQuizEngine.ts'), 'utf8');
    expect(source).toMatch(/mode==='mock-exam'\?createMockExam\(pool,newSeed\(\)\)/);
    expect(source).not.toMatch(/createExam\(/);
  });

  it('shows the domain breakdown on the exam-complete screen', () => {
    const source = readFileSync(path.join(__dirname, '../components/PracticeQuiz.tsx'), 'utf8');
    expect(source).toMatch(/s\.complete&&<DomainBreakdown history=\{examHistory\}\/>/);
  });
});

describe('Network Security Essentials mock exams', () => {
  const pool = filterQuestions({ track: 'local' });
  const nse = (questions: readonly { id: number; topic: string }[]) => {
    const tally: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const q of questions) tally[nseCategory(q as never)!]++;
    return tally;
  };

  it('gives a 50-question mock the published NSE category split', () => {
    expect(blueprintQuotas(50, 'nse')).toEqual({ 1: 5, 2: 5, 3: 7, 4: 13, 5: 13, 6: 7 });
    for (let size = 1; size <= 80; size++) {
      expect(Object.values(blueprintQuotas(size, 'nse')).reduce((a, b) => a + b, 0), `size ${size}`).toBe(size);
    }
  });

  it('draws a whole Local Firebox pool to the blueprint, whatever the seed', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const exam = createMockExam(pool, seed);
      expect(exam).toHaveLength(50);
      expect(nse(exam), `seed ${seed}`).toEqual({ 1: 5, 2: 5, 3: 7, 4: 13, 5: 13, 6: 7 });
      expect(exam.every(q => (q.track ?? 'local') === 'local')).toBe(true);
    }
  });

  it('keeps the uniform draw for a Network+ pool mixed with Local questions', () => {
    const mixed = filterQuestions({ track: 'all' });
    expect(createBlueprintExam(mixed, 4)).toBeNull();
  });

  it('scores a finished NSE mock by category and against the 75% pass mark', () => {
    const exam = createMockExam(pool, 31);
    // Everything right except Authentication and VPNs.
    const history = exam.map(q => ({ questionId: q.id, isCorrect: nseCategory(q) !== 6 }));
    const results = examResults(history)!;
    expect(results.blueprint).toBe('nse');
    expect(results.passMark).toBe(75);
    expect(results.rows.map(r => [r.domain, r.correct, r.total])).toEqual([[1, 5, 5], [2, 5, 5], [3, 7, 7], [4, 13, 13], [5, 13, 13], [6, 0, 7]]);
    const html = renderToStaticMarkup(<DomainBreakdown history={history} />);
    expect(html).toContain('Score by exam category');
    expect(html).toContain('86% overall. The real exam needs 75%, so this attempt would pass.');
    expect(html).toContain('Weakest in this attempt: <strong>Authentication and VPNs</strong>, worth 15%');

    const failing = exam.map((q, i) => ({ questionId: q.id, isCorrect: i % 2 === 0 }));
    expect(renderToStaticMarkup(<DomainBreakdown history={failing} />)).toContain('50% overall. The real exam needs 75%, so this attempt is 25 points short.');
  });

  it('does not claim a percentage pass mark for Network+', () => {
    const exam = createMockExam(filterQuestions({ track: 'network-plus' }), 3);
    const html = renderToStaticMarkup(<DomainBreakdown history={exam.map(q => ({ questionId: q.id, isCorrect: true }))} />);
    expect(html).toContain('Score by exam domain');
    expect(html).not.toContain('The real exam needs');
  });
});
