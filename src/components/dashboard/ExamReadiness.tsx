import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { useLearningTrack } from '../../engine/LearningTrack';
import { examReadiness, READINESS_MIN_ANSWERS, type BlueprintId } from '../../engine/mockExam';
import type { Track } from '../../engine/types';

const BLUEPRINT: Partial<Record<Track, { id: BlueprintId; exam: string }>> = {
  local: { id: 'nse', exam: 'WatchGuard Network Security Essentials' },
  'network-plus': { id: 'network-plus', exam: 'CompTIA Network+ N10-009' },
};

/**
 * How ready the learner is for the exam on their current track, by published category.
 *
 * The per-attempt breakdown after a mock answers "how did that attempt go". This answers the question
 * a learner brings to a progress page, "am I ready, and what should I study next", from everything
 * practised so far, weighted the way the real exam is weighted.
 */
export default function ExamReadiness({ history }: { history: readonly { questionId: number; isCorrect: boolean }[] }) {
  const { track } = useLearningTrack();
  const blueprint = BLUEPRINT[track];
  const readiness = useMemo(() => (blueprint ? examReadiness(history, blueprint.id) : null), [history, blueprint]);

  if (!blueprint || !readiness) {
    return (
      <section className="exam-readiness" aria-labelledby="exam-readiness-title">
        <h3 id="exam-readiness-title"><Target aria-hidden="true" />Exam readiness</h3>
        <p className="readiness-summary">
          WatchGuard Cloud has no published exam outline to measure against, so readiness is shown for the Local Firebox
          and Network+ tracks. Switch the learning track to see either one. Your Cloud answers still appear in the topic list below.
        </p>
      </section>
    );
  }

  const { rows, unit, passMark, estimate, focus } = readiness;
  const plural = unit === 'domain' ? 'domains' : 'categories';
  const ready = rows.filter(r => r.score !== null).length;

  return (
    <section className="exam-readiness" aria-labelledby="exam-readiness-title">
      <h3 id="exam-readiness-title"><Target aria-hidden="true" />Exam readiness · {blueprint.exam}</h3>
      {estimate !== null ? (
        <p className={`readiness-summary${passMark === undefined ? '' : estimate >= passMark ? ' is-above' : ' is-below'}`}>
          <strong>{estimate}%</strong> weighted by the exam outline.{' '}
          {passMark !== undefined
            ? estimate >= passMark
              ? `The exam needs ${passMark}%, so you are on track.`
              : `The exam needs ${passMark}%, so you are ${passMark - estimate} points short.`
            : 'CompTIA reports a scaled score (720 on a 100–900 scale), not a percentage, so use this to compare domains rather than to predict a pass.'}
        </p>
      ) : (
        <p className="readiness-summary">
          Answer at least {READINESS_MIN_ANSWERS} questions in every {unit} for an overall estimate. {ready} of {rows.length} {plural} have enough so far.
        </p>
      )}

      <div className="readiness-table">
        <table>
          <thead>
            <tr>
              <th scope="col">{unit === 'domain' ? 'Domain' : 'Category'}</th>
              <th scope="col">Weight</th>
              <th scope="col">Answered</th>
              <th scope="col">Latest score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.domain} className={focus?.domain === r.domain ? 'is-focus' : undefined}>
                <th scope="row">{unit === 'domain' ? `${r.domain}.0 ` : ''}{r.name}</th>
                <td>{r.weight}%</td>
                <td>{r.answered} of {r.available}</td>
                <td>
                  {r.score === null ? (
                    <span className="readiness-pending">{READINESS_MIN_ANSWERS - r.answered} more to score</span>
                  ) : (
                    <>
                      <span className="readiness-score">{r.correct}/{r.answered} · {r.score}%</span>
                      <span
                        className={`readiness-bar${passMark !== undefined && r.score >= passMark ? ' is-pass' : ''}`}
                        style={passMark !== undefined ? { ['--pass' as string]: `${passMark}%` } : undefined}
                        aria-hidden="true"
                      >
                        <span style={{ width: `${r.score}%` }} />
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {focus && (
        <p className="readiness-focus">
          Study next: <strong>{focus.name}</strong>, worth {focus.weight}% of the exam
          {focus.score === null ? ', where you have not answered enough questions for a score yet.' : `, where you are at ${focus.score}%.`}
        </p>
      )}
      <p className="readiness-note">Each question counts once, by your most recent answer, so questions you have since got right no longer count against you.</p>
    </section>
  );
}
