import { PLAN_TARGET } from '../engine/examPlan';
import { examResults } from '../engine/mockExam';

/**
 * Per-domain result for a finished Network+ or NSE mock.
 *
 * A single percentage hides the thing a learner most needs to know: both exams are passed or failed as
 * a whole, so a strong score in one area can carry a weak one right up until the real exam draws a
 * harder set there. Showing each domain against its weighting makes the gap visible while there is
 * still time to study it. WatchGuard publishes a 75% passing score, so an NSE mock is also compared
 * with it, and with the higher practice target; CompTIA reports a scaled score instead, so no
 * percentage is claimed for Network+.
 */
export default function DomainBreakdown({ history }: { history: readonly { questionId: number; isCorrect: boolean }[] }) {
  const results = examResults(history);
  if (!results || !results.rows.length) return null;
  const { rows, unit, passMark } = results;
  const pct = (r: { correct: number; total: number }) => Math.round((r.correct / r.total) * 100);
  const weakest = rows.reduce((low, r) => (pct(r) < pct(low) ? r : low));
  const uneven = rows.some(r => pct(r) !== pct(weakest));
  const overall = Math.round((history.filter(h => h.isCorrect).length / history.length) * 100);
  return (
    <section className="domain-breakdown" aria-label={`Score by exam ${unit}`}>
      <h3>Score by exam {unit}</h3>
      {passMark !== undefined && (
        <p className={`domain-passmark ${overall >= PLAN_TARGET ? 'is-above' : overall >= passMark ? 'is-near' : 'is-below'}`}>
          {overall}% overall.{' '}
          {overall >= PLAN_TARGET
            ? `That clears the ${passMark}% the real exam needs and the ${PLAN_TARGET}% target.`
            : overall >= passMark
              ? `That would pass the real exam, which needs ${passMark}%, but is ${PLAN_TARGET - overall} points short of the ${PLAN_TARGET}% target that leaves room for a harder set on the day.`
              : `That is ${passMark - overall} points short of the ${passMark}% the real exam needs, and ${PLAN_TARGET - overall} short of the ${PLAN_TARGET}% target.`}
        </p>
      )}
      <table>
        <thead><tr><th scope="col">{unit === 'domain' ? 'Domain' : 'Category'}</th><th scope="col">Exam weight</th><th scope="col">Score</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.domain} className={uneven && r.domain === weakest.domain ? 'is-weakest' : undefined}>
              <th scope="row">{unit === 'domain' ? `${r.domain}.0 ` : ''}{r.name}</th>
              <td>{r.weight}%</td>
              <td>
                <span className="domain-score">{r.correct}/{r.total} · {pct(r)}%</span>
                <span className="domain-bar" aria-hidden="true"><span style={{ width: `${pct(r)}%` }} /></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {uneven && <p>Weakest in this attempt: <strong>{weakest.name}</strong>, worth {weakest.weight}% of the real exam.</p>}
    </section>
  );
}
