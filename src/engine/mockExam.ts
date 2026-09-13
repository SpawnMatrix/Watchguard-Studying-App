import type { Question } from '../data/questions';
import { N10_009_WEIGHTS, NETWORK_PLUS_DOMAIN, type NetworkPlusDomain } from '../data/networkPlusBlueprint';
import { createExam } from './catalog';
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
 * So a Network+ mock takes a fixed number of questions from each domain, in the published
 * proportions, and then shuffles them together. Anything that is not a whole Network+ pool - a
 * single topic, the Local Firebox or Cloud tracks, All tracks, a format filter that empties a domain
 * - keeps the uniform draw, because there is no blueprint to honour and forcing one would distort it.
 */

const DOMAINS: NetworkPlusDomain[] = [1, 2, 3, 4, 5];

/**
 * Whole-question quotas per domain for an exam of `size`, by largest remainder so they always sum to
 * `size`. Ties go to the heavier domain. For 50 questions: 12 / 10 / 9 / 7 / 12.
 */
export function blueprintQuotas(size: number): Record<NetworkPlusDomain, number> {
  const exact = DOMAINS.map(domain => ({ domain, value: (N10_009_WEIGHTS[domain].weight / 100) * size }));
  const quotas = Object.fromEntries(exact.map(e => [e.domain, Math.floor(e.value)])) as Record<NetworkPlusDomain, number>;
  let remaining = size - DOMAINS.reduce((sum, d) => sum + quotas[d], 0);
  const byRemainder = [...exact].sort((a, b) =>
    (b.value - Math.floor(b.value)) - (a.value - Math.floor(a.value)) ||
    N10_009_WEIGHTS[b.domain].weight - N10_009_WEIGHTS[a.domain].weight);
  for (const { domain } of byRemainder) {
    if (remaining <= 0) break;
    quotas[domain]++;
    remaining--;
  }
  return quotas;
}

/** Splits a pool by domain, or returns null when the pool is not wholly Network+ material. */
function byDomain(pool: readonly Question[]): Record<NetworkPlusDomain, Question[]> | null {
  const groups: Record<NetworkPlusDomain, Question[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const q of pool) {
    const domain = NETWORK_PLUS_DOMAIN[q.id];
    if (!domain || q.track !== 'network-plus') return null;
    groups[domain].push(q);
  }
  return groups;
}

/** A domain can fill its quota if it has enough distinct questions, or a template to draw variants from. */
const canFill = (questions: readonly Question[], quota: number) =>
  questions.some(q => q.variant) || questions.length >= quota;

/**
 * The blueprint exam for a whole Network+ pool, or null when the pool cannot honour the blueprint.
 * Deterministic for a given pool and seed, like createExam.
 */
export function createBlueprintExam(pool: readonly Question[], seed: number, size = 50): Question[] | null {
  const groups = byDomain(pool);
  if (!groups || !pool.length) return null;
  const quotas = blueprintQuotas(size);
  if (!DOMAINS.every(d => canFill(groups[d], quotas[d]))) return null;

  const rng = seededRandom(seed);
  const drawn = DOMAINS.flatMap(d => createExam(groups[d], Math.floor(rng() * 4294967296), quotas[d]));
  // Interleave the domains; answering twelve Concepts questions in a row is not how the exam reads.
  return shuffle(drawn, rng);
}

/** What the quiz engine calls: the blueprint when it applies, the uniform draw otherwise. */
export function createMockExam(pool: readonly Question[], seed: number, size = 50): Question[] {
  return createBlueprintExam(pool, seed, size) ?? createExam(pool, seed, size);
}

export interface DomainResult {
  domain: NetworkPlusDomain;
  name: string;
  weight: number;
  correct: number;
  total: number;
}

/**
 * Score per N10-009 domain for a finished attempt. Empty unless every answer is Network+ material,
 * so a Local Firebox mock never shows a misleading partial breakdown.
 */
export function domainResults(history: readonly { questionId: number; isCorrect: boolean }[]): DomainResult[] {
  if (!history.length || history.some(h => !NETWORK_PLUS_DOMAIN[h.questionId])) return [];
  return DOMAINS.map(domain => {
    const answers = history.filter(h => NETWORK_PLUS_DOMAIN[h.questionId] === domain);
    return { domain, ...N10_009_WEIGHTS[domain], correct: answers.filter(h => h.isCorrect).length, total: answers.length };
  }).filter(r => r.total > 0);
}
