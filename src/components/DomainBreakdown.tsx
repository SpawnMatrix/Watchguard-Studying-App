import { domainResults } from '../engine/mockExam';

/**
 * Per-domain result for a finished Network+ mock.
 *
 * A single percentage hides the thing a learner most needs to know: CompTIA reports a pass or fail
 * across the whole exam, so a strong Concepts score can carry a weak Security score right up until
 * the real exam draws a harder Security set. Showing each domain against its weighting makes the gap
 * visible while there is still time to study it.
 */
export default function DomainBreakdown({ history }: { history: readonly { questionId: number; isCorrect: boolean }[] }) {
  const rows = domainResults(history);
  if (!rows.length) return null;
  const pct = (r: { correct: number; total: number }) => Math.round((r.correct / r.total) * 100);
  const weakest = rows.reduce((low, r) => (pct(r) < pct(low) ? r : low));
  const uneven = rows.some(r => pct(r) !== pct(weakest));
  return (
    <section className="domain-breakdown" aria-label="Score by N10-009 domain">
      <h3>Score by exam domain</h3>
      <table>
        <thead><tr><th scope="col">Domain</th><th scope="col">Exam weight</th><th scope="col">Score</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.domain} className={uneven && r.domain === weakest.domain ? 'is-weakest' : undefined}>
              <th scope="row">{r.domain}.0 {r.name}</th>
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
