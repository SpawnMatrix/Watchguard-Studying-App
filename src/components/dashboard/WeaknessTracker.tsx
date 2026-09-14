import { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import { useLearningTrack } from '../../engine/LearningTrack';
import { questionById } from '../../engine/catalog';

/** Answers needed in a topic before it is judged, so one unlucky miss does not flag a topic. */
export const TOPIC_MIN_ANSWERS = 3;
/** Topics below this share of latest answers right are listed for review. */
export const TOPIC_REVIEW_BELOW = 75;

export interface TopicStanding { topic: string; correct: number; total: number; percent: number }

/** Latest answer per question on the track, grouped by topic, weakest first. */
export function topicStandings(history: readonly { questionId: number; isCorrect: boolean; topic: string }[], track: string): TopicStanding[] {
  const latest = new Map<number, { topic: string; isCorrect: boolean }>();
  for (const h of history) {
    if ((questionById.get(h.questionId)?.track ?? 'local') === track) latest.set(h.questionId, h);
  }
  const topics = new Map<string, { correct: number; total: number }>();
  for (const { topic, isCorrect } of latest.values()) {
    const t = topics.get(topic) ?? { correct: 0, total: 0 };
    t.total++;
    if (isCorrect) t.correct++;
    topics.set(topic, t);
  }
  return [...topics]
    .map(([topic, t]) => ({ topic, ...t, percent: Math.round((t.correct / t.total) * 100) }))
    .sort((a, b) => a.percent - b.percent || b.total - a.total);
}

export default function WeaknessTracker({ history }: { history: readonly { questionId: number; isCorrect: boolean; topic: string }[] }) {
  const { track } = useLearningTrack();
  const standings = useMemo(() => topicStandings(history, track), [history, track]);
  const judged = standings.filter(t => t.total >= TOPIC_MIN_ANSWERS);
  const review = judged.filter(t => t.percent < TOPIC_REVIEW_BELOW);

  return (
    <section className="topic-review" aria-labelledby="topic-review-title">
      <h3 id="topic-review-title"><ListChecks aria-hidden="true" />Topics to review</h3>
      {standings.length === 0 ? (
        <p className="topic-review-empty">Answer practice questions on this track, and the topics you miss most will be listed here.</p>
      ) : review.length === 0 ? (
        <p className="topic-review-empty">
          {judged.length
            ? `Every topic with ${TOPIC_MIN_ANSWERS} or more answers is at ${TOPIC_REVIEW_BELOW}% or better. A mock exam is a good way to confirm it.`
            : `No topic has ${TOPIC_MIN_ANSWERS} answers yet. Keep practising and the weakest ones will show up here.`}
        </p>
      ) : (
        <>
          <p className="topic-review-intro">Below {TOPIC_REVIEW_BELOW}% on your latest answers, weakest first.</p>
          <ul>
            {review.map(t => (
              <li key={t.topic}>
                <span className="topic-name">{t.topic}</span>
                <span className="topic-count">{t.correct} of {t.total} right · {t.percent}%</span>
                <span className="readiness-bar" aria-hidden="true"><span style={{ width: `${t.percent}%` }} /></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
