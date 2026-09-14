import type { Question } from '../data/questions';
import { N10_009_WEIGHTS, NETWORK_PLUS_DOMAIN } from '../data/networkPlusBlueprint';
import { NSE_WEIGHTS, nseCategory } from '../data/nseBlueprint';
import { createExam, questionById } from './catalog';
import { seededRandom, shuffle } from './random';

/**
 * Mock exams that are shaped like the exam they rehearse.
 *
 * A balanced question bank is not enough on its own. Drawing 50 questions uniformly from the 174
 * Network+ items gives the right mix on average and a poor one often. Measured over 20,000 seeds,
 * Network Security (14%, so 7 of 50) drew four or fewer questions in one mock in ten, and anywhere
 * from 1 to 16 overall; Troubleshooting was short just as often. A learner who draws a light-Security
 * mock and scores well has been told something the real exam will not confirm.
 *
 * So a mock drawn from a whole exam track takes a fixed number of questions from each domain, in the
 * published proportions, and then shuffles them together. That covers two exams: CompTIA Network+
 * N10-009 and WatchGuard Network Security Essentials for Locally-Managed Fireboxes. Anything else - a
 * single topic, the Cloud track, All tracks, a format filter that empties a domain - keeps the uniform
 * draw, because there is no blueprint to honour and forcing one would distort it.
 */

export type BlueprintId = 'network-plus' | 'nse';

interface Blueprint {
  id: BlueprintId;
  /** What one row of the published outline is called. */
  unit: 'domain' | 'category';
  weights: Record<number, { name: string; weight: number }>;
  /** The category a question counts towards, or undefined if it is not part of this exam's pool. */
  classify: (q: Pick<Question, 'id' | 'topic' | 'track'>) => number | undefined;
  /** Published passing score as a percentage, where the vendor states one. */
  passMark?: number;
}

const BLUEPRINTS: Blueprint[] = [
  {
    id: 'network-plus', unit: 'domain', weights: N10_009_WEIGHTS,
    classify: q => q.track === 'network-plus' ? NETWORK_PLUS_DOMAIN[q.id] : undefined,
    // CompTIA reports a scaled score (720 on 100-900), not a percentage, so no pass mark is claimed.
  },
  {
    id: 'nse', unit: 'category', weights: NSE_WEIGHTS,
    classify: q => (q.track ?? 'local') === 'local' ? nseCategory(q) : undefined,
    // Network Security Essentials for Locally-Managed Fireboxes Study Guide, Exam Description.
    passMark: 75,
  },
];

const categoriesOf = (b: Blueprint) => Object.keys(b.weights).map(Number).sort((x, y) => x - y);

/**
 * Whole-question quotas per category for an exam of `size`, by largest remainder so they always sum
 * to `size`. Ties go to the heavier category. Network+ at 50: 12/10/9/7/12. NSE at 50: 5/5/7/13/13/7.
 */
export function blueprintQuotas(size: number, blueprint: BlueprintId = 'network-plus'): Record<number, number> {
  const b = BLUEPRINTS.find(x => x.id === blueprint)!;
  const exact = categoriesOf(b).map(category => ({ category, value: (b.weights[category].weight / 100) * size }));
  const quotas: Record<number, number> = Object.fromEntries(exact.map(e => [e.category, Math.floor(e.value)]));
  let remaining = size - exact.reduce((sum, e) => sum + quotas[e.category], 0);
  const byRemainder = [...exact].sort((x, y) =>
    (y.value - Math.floor(y.value)) - (x.value - Math.floor(x.value)) || b.weights[y.category].weight - b.weights[x.category].weight);
  for (const { category } of byRemainder) {
    if (remaining <= 0) break;
    quotas[category]++;
    remaining--;
  }
  return quotas;
}

/** The blueprint a pool belongs to, if every question in it is part of the same exam's outline. */
function blueprintFor(pool: readonly Question[]): Blueprint | undefined {
  return pool.length ? BLUEPRINTS.find(b => pool.every(q => b.classify(q) !== undefined)) : undefined;
}

/** A category can fill its quota if it has enough distinct questions, or a template to draw variants from. */
const canFill = (questions: readonly Question[], quota: number) => quota === 0 || questions.some(q => q.variant) || questions.length >= quota;

/**
 * The blueprint exam for a whole exam pool, or null when the pool cannot honour a blueprint.
 * Deterministic for a given pool and seed, like createExam.
 */
export function createBlueprintExam(pool: readonly Question[], seed: number, size = 50): Question[] | null {
  const b = blueprintFor(pool);
  if (!b) return null;
  const quotas = blueprintQuotas(size, b.id);
  const groups = new Map<number, Question[]>(categoriesOf(b).map(c => [c, []]));
  for (const q of pool) groups.get(b.classify(q)!)!.push(q);
  if (!categoriesOf(b).every(c => canFill(groups.get(c)!, quotas[c]))) return null;

  const rng = seededRandom(seed);
  const drawn = categoriesOf(b).flatMap(c => createExam(groups.get(c)!, Math.floor(rng() * 4294967296), quotas[c]));
  // Interleave the categories; answering twelve Concepts questions in a row is not how the exam reads.
  return shuffle(drawn, rng);
}

/** What the quiz engine calls: the blueprint when it applies, the uniform draw otherwise. */
export function createMockExam(pool: readonly Question[], seed: number, size = 50): Question[] {
  return createBlueprintExam(pool, seed, size) ?? createExam(pool, seed, size);
}

export interface DomainResult {
  domain: number;
  name: string;
  weight: number;
  correct: number;
  total: number;
}

export interface ExamResults {
  blueprint: BlueprintId;
  unit: 'domain' | 'category';
  passMark?: number;
  rows: DomainResult[];
}

/**
 * Score per published category for a finished attempt. Null unless every answer belongs to one
 * exam's outline, so a mixed or Cloud-track attempt never shows a misleading partial breakdown.
 */
export function examResults(history: readonly { questionId: number; isCorrect: boolean }[]): ExamResults | null {
  if (!history.length) return null;
  const questions = history.map(h => questionById.get(h.questionId));
  if (questions.some(q => !q)) return null;
  const b = BLUEPRINTS.find(x => questions.every(q => x.classify(q!) !== undefined));
  if (!b) return null;
  const rows = categoriesOf(b).map(domain => {
    const answers = history.filter((_, i) => b.classify(questions[i]!) === domain);
    return { domain, ...b.weights[domain], correct: answers.filter(h => h.isCorrect).length, total: answers.length };
  }).filter(r => r.total > 0);
  return { blueprint: b.id, unit: b.unit, passMark: b.passMark, rows };
}

/** Network+ domain rows only; kept for callers that predate the NSE blueprint. */
export function domainResults(history: readonly { questionId: number; isCorrect: boolean }[]): DomainResult[] {
  const results = examResults(history);
  return results?.blueprint === 'network-plus' ? results.rows : [];
}
