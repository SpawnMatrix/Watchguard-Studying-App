import type { Question } from '../data/questions';
import { N10_009_WEIGHTS, NETWORK_PLUS_DOMAIN } from '../data/networkPlusBlueprint';
import { NSE_WEIGHTS, nseCategory } from '../data/nseBlueprint';
import { twinGroup } from '../data/questionTwins';
import { createExam, questionById, studyQuestions } from './catalog';
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
 * The pool with at most one question from each same-fact group (see questionTwins.ts), chosen at
 * random for the seed. Used only when enough questions remain to fill the exam, so a small filtered
 * pool is never shortened.
 */
export function withoutTwins(pool: readonly Question[], seed: number, size: number): readonly Question[] {
  const kept = new Set<number>();
  const deduped = shuffle(pool, seededRandom(seed ^ 0x2545f491)).filter(q => {
    const group = q.variant ? undefined : twinGroup(q.id);
    if (group === undefined) return true;
    if (kept.has(group)) return false;
    kept.add(group);
    return true;
  });
  if (deduped.length === pool.length) return pool;
  const order = new Map(pool.map((q, i) => [q, i]));
  const inPoolOrder = deduped.sort((a, b) => order.get(a)! - order.get(b)!);
  return inPoolOrder.length >= size || inPoolOrder.some(q => q.variant) ? inPoolOrder : pool;
}

/**
 * The blueprint exam for a whole exam pool, or null when the pool cannot honour a blueprint.
 * Deterministic for a given pool and seed, like createExam.
 */
export function createBlueprintExam(pool: readonly Question[], seed: number, size = 50): Question[] | null {
  const b = blueprintFor(pool);
  if (!b) return null;
  const quotas = blueprintQuotas(size, b.id);
  const group = (questions: readonly Question[]) => {
    const groups = new Map<number, Question[]>(categoriesOf(b).map(c => [c, []]));
    for (const q of questions) groups.get(b.classify(q)!)!.push(q);
    return categoriesOf(b).every(c => canFill(groups.get(c)!, quotas[c])) ? groups : null;
  };
  // Prefer one question per same-fact group; fall back to the whole pool if that leaves a category short.
  const groups = group(withoutTwins(pool, seed, size)) ?? group(pool);
  if (!groups) return null;

  const rng = seededRandom(seed);
  const drawn = categoriesOf(b).flatMap(c => createExam(groups.get(c)!, Math.floor(rng() * 4294967296), quotas[c]));
  // Interleave the categories; answering twelve Concepts questions in a row is not how the exam reads.
  return shuffle(drawn, rng);
}

/** What the quiz engine calls: the blueprint when it applies, the uniform draw otherwise. */
export function createMockExam(pool: readonly Question[], seed: number, size = 50): Question[] {
  return createBlueprintExam(pool, seed, size) ?? createExam(withoutTwins(pool, seed, size), seed, size);
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

/** Fewest distinct questions answered in a category before its score is shown. */
export const READINESS_MIN_ANSWERS = 5;

export interface ReadinessRow {
  domain: number;
  name: string;
  weight: number;
  /** Distinct questions from this category the learner has answered. */
  answered: number;
  /** Of those, how many were right the last time they were answered. */
  correct: number;
  /** Questions in the bank that count towards this category. */
  available: number;
  /** Percentage right, or null until READINESS_MIN_ANSWERS questions have been answered. */
  score: number | null;
}

export interface ExamReadiness {
  blueprint: BlueprintId;
  unit: 'domain' | 'category';
  passMark?: number;
  rows: ReadinessRow[];
  /** Blueprint-weighted score, once every category has enough answers; null before that. */
  estimate: number | null;
  /** The category that would gain most from study: the most exam weight left unanswered correctly. */
  focus: ReadinessRow | null;
}

/**
 * Readiness for one exam across all practice so far, not one attempt.
 *
 * Each question counts once, by its most recent answer, so a question missed early and answered
 * correctly since counts as known, and repeating an easy question does not inflate the score. A
 * category shows no score until it has READINESS_MIN_ANSWERS answers, and the weighted estimate waits
 * for every category, because a figure built from two lucky answers would mislead more than it helps.
 */
export function examReadiness(
  history: readonly { questionId: number; isCorrect: boolean }[],
  blueprint: BlueprintId,
  bank: readonly Question[] = studyQuestions,
): ExamReadiness {
  const b = BLUEPRINTS.find(x => x.id === blueprint)!;
  const latest = new Map<number, boolean>();
  for (const h of history) latest.set(h.questionId, h.isCorrect);
  const rows = categoriesOf(b).map(domain => {
    let answered = 0, correct = 0;
    for (const [id, isCorrect] of latest) {
      const q = questionById.get(id);
      if (!q || b.classify(q) !== domain) continue;
      answered++;
      if (isCorrect) correct++;
    }
    const available = bank.filter(q => b.classify(q) === domain).length;
    const score = answered >= READINESS_MIN_ANSWERS ? Math.round((correct / answered) * 100) : null;
    return { domain, ...b.weights[domain], answered, correct, available, score };
  });
  const scored = rows.filter(r => r.score !== null);
  const estimate = scored.length === rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.weight * r.score!, 0) / rows.reduce((sum, r) => sum + r.weight, 0))
    : null;
  const gap = (r: ReadinessRow) => r.weight * (100 - (r.score ?? 0));
  const focus = rows.filter(r => r.score === null || r.score < 100).reduce<ReadinessRow | null>((best, r) => (!best || gap(r) > gap(best) ? r : best), null);
  return { blueprint: b.id, unit: b.unit, passMark: b.passMark, rows, estimate, focus };
}

/** Network+ domain rows only; kept for callers that predate the NSE blueprint. */
export function domainResults(history: readonly { questionId: number; isCorrect: boolean }[]): DomainResult[] {
  const results = examResults(history);
  return results?.blueprint === 'network-plus' ? results.rows : [];
}
