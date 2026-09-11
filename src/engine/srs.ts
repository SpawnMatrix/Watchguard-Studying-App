/**
 * Leitner-style spaced repetition.
 *
 * Two layers, because they answer different questions:
 *
 *   cards  — "when should this specific question come back?"
 *   topics — "which areas is this technician actually weak in?"
 *
 * The topic layer is what biases quiz generation, so a learner who keeps
 * missing BOVPN questions sees more BOVPN without having to ask for it.
 *
 * Everything here is pure: state in, state out. The engine owns persistence.
 */

export const BOX_COUNT = 5;

/** Interval before a card in each box is due again, in days. Box 1 is "now". */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 21] as const;

const DAY_MS = 24 * 60 * 60_000;

export interface SrsCard {
  /** 1-based Leitner box. Box 5 is considered retained. */
  box: number;
  /** Epoch ms when this card becomes reviewable again. */
  due: number;
  /** How many times a correct answer later regressed to box 1. */
  lapses: number;
  reviews: number;
  lastSeen: number;
}

export interface TopicStat {
  correct: number;
  seen: number;
  /** Consecutive misses; drives the urgency bonus. */
  streak: number;
  lastSeen: number;
}

export interface SrsState {
  cards: Record<string, SrsCard>;
  topics: Record<string, TopicStat>;
  version: 1;
}

export const emptySrsState = (): SrsState => ({ cards: {}, topics: {}, version: 1 });

const clampBox = (box: number) => Math.min(Math.max(box, 1), BOX_COUNT);

export function dueAt(box: number, now: number): number {
  return now + BOX_INTERVAL_DAYS[clampBox(box) - 1] * DAY_MS;
}

/**
 * Records one answer.
 *
 * A correct answer promotes one box; a miss drops straight back to box 1
 * rather than stepping down, because a missed item is not "slightly less
 * known" — it is unlearned, and the schedule should treat it that way.
 */
export function recordAnswer(state: SrsState, questionId: number, topic: string, isCorrect: boolean, now = Date.now()): SrsState {
  const key = String(questionId);
  const previous = state.cards[key];
  // A card not yet seen is conceptually in box 1, so answering it correctly
  // promotes it to box 2 — the standard Leitner step, not box 1 again.
  const box = clampBox(isCorrect ? (previous?.box ?? 1) + 1 : 1);
  const card: SrsCard = {
    box,
    due: dueAt(box, now),
    lapses: (previous?.lapses ?? 0) + (isCorrect || !previous ? 0 : 1),
    reviews: (previous?.reviews ?? 0) + 1,
    lastSeen: now,
  };
  const stat = state.topics[topic] ?? { correct: 0, seen: 0, streak: 0, lastSeen: 0 };
  const topics = {
    ...state.topics,
    [topic]: {
      correct: stat.correct + (isCorrect ? 1 : 0),
      seen: stat.seen + 1,
      streak: isCorrect ? 0 : stat.streak + 1,
      lastSeen: now,
    },
  };
  return { ...state, cards: { ...state.cards, [key]: card }, topics };
}

/** Cards whose interval has elapsed, soonest first. */
export function dueCards(state: SrsState, now = Date.now()): number[] {
  return Object.entries(state.cards)
    .filter(([, card]) => card.box < BOX_COUNT && card.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => Number(id));
}

export function retainedCount(state: SrsState): number {
  return Object.values(state.cards).filter(card => card.box >= BOX_COUNT).length;
}

/**
 * Relative sampling weight for a topic.
 *
 * An unseen topic sits at the baseline so coverage still happens. Accuracy
 * below the target pushes the weight up, a run of consecutive misses adds
 * urgency on top, and the result is clamped so one bad topic can never
 * crowd the rest of the syllabus out of a session entirely.
 */
export const WEIGHT_FLOOR = 0.5;
export const WEIGHT_CEILING = 4;
const TARGET_ACCURACY = 0.85;
/** Below this many attempts a topic's accuracy is too noisy to act on. */
const CONFIDENCE_THRESHOLD = 3;

export function topicWeight(stat: TopicStat | undefined): number {
  if (!stat || stat.seen === 0) return 1;
  const accuracy = stat.correct / stat.seen;
  const shortfall = Math.max(0, TARGET_ACCURACY - accuracy);
  // Ramp in the adjustment while evidence is thin rather than reacting to
  // a single unlucky answer.
  const confidence = Math.min(1, stat.seen / CONFIDENCE_THRESHOLD);
  const weight = 1 + shortfall * 4 * confidence + Math.min(stat.streak, 3) * 0.35;
  return Math.min(WEIGHT_CEILING, Math.max(WEIGHT_FLOOR, weight));
}

export function topicWeights(state: SrsState, topics: readonly string[]): Record<string, number> {
  return Object.fromEntries(topics.map(topic => [topic, topicWeight(state.topics[topic])]));
}

export interface WeightedItem { id: number; topic: string }

/**
 * Picks one item with probability proportional to its topic weight, and an
 * extra multiplier when the card itself is due. `random` is the caller's
 * seeded generator, so selection stays reproducible for a given seed.
 */
export function weightedPick<T extends WeightedItem>(random: () => number, pool: readonly T[], state: SrsState, now = Date.now()): T | null {
  if (!pool.length) return null;
  const weights = pool.map(item => {
    const card = state.cards[String(item.id)];
    const dueBonus = card && card.box < BOX_COUNT && card.due <= now ? 1.8 : 1;
    // A card already retained should not vanish, but it has earned a rest.
    const retainedPenalty = card && card.box >= BOX_COUNT ? 0.35 : 1;
    return topicWeight(state.topics[item.topic]) * dueBonus * retainedPenalty;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return pool[Math.floor(random() * pool.length)] ?? null;
  let threshold = random() * total;
  for (let index = 0; index < pool.length; index++) {
    threshold -= weights[index];
    if (threshold <= 0) return pool[index];
  }
  return pool[pool.length - 1];
}

/** Topics ordered by how much attention they need, for the dashboard. */
export function weakestTopics(state: SrsState, limit = 5): { topic: string; accuracy: number; seen: number; weight: number }[] {
  return Object.entries(state.topics)
    .filter(([, stat]) => stat.seen > 0)
    .map(([topic, stat]) => ({ topic, accuracy: stat.correct / stat.seen, seen: stat.seen, weight: topicWeight(stat) }))
    .sort((a, b) => b.weight - a.weight || a.accuracy - b.accuracy)
    .slice(0, limit);
}

/** Defensive parse for state arriving from browser storage or a server sync. */
export function parseSrsState(input: unknown): SrsState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return emptySrsState();
  const raw = input as Partial<SrsState>;
  const cards: Record<string, SrsCard> = {};
  for (const [key, value] of Object.entries(raw.cards ?? {})) {
    if (!/^\d+$/.test(key) || !value || typeof value !== 'object') continue;
    const card = value as Partial<SrsCard>;
    if (!Number.isInteger(card.box) || card.box! < 1 || card.box! > BOX_COUNT) continue;
    if (!Number.isFinite(card.due)) continue;
    cards[key] = {
      box: card.box!,
      due: card.due!,
      lapses: Number.isInteger(card.lapses) ? card.lapses! : 0,
      reviews: Number.isInteger(card.reviews) ? card.reviews! : 0,
      lastSeen: Number.isFinite(card.lastSeen) ? card.lastSeen! : 0,
    };
  }
  const topics: Record<string, TopicStat> = {};
  for (const [key, value] of Object.entries(raw.topics ?? {})) {
    if (typeof key !== 'string' || key.length > 64 || !value || typeof value !== 'object') continue;
    const stat = value as Partial<TopicStat>;
    if (!Number.isInteger(stat.seen) || stat.seen! < 0) continue;
    const seen = stat.seen!;
    topics[key] = {
      seen,
      correct: Number.isInteger(stat.correct) ? Math.min(Math.max(stat.correct!, 0), seen) : 0,
      streak: Number.isInteger(stat.streak) && stat.streak! >= 0 ? stat.streak! : 0,
      lastSeen: Number.isFinite(stat.lastSeen) ? stat.lastSeen! : 0,
    };
  }
  return { cards, topics, version: 1 };
}
