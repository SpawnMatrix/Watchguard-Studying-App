import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { useLearningTrack } from '../../engine/LearningTrack';
import { examReadiness, READINESS_MIN_ANSWERS, type BlueprintId } from '../../engine/mockExam';
import { EXAM_PLAN_KEY, PLAN_TARGET, examPlan, isoDay, parseDay, validExamDates, type ExamDates, type PlanPhase } from '../../engine/examPlan';
import { readJSON, writeStudyValue } from '../../account/storage';
import type { Track } from '../../engine/types';

const BLUEPRINT: Partial<Record<Track, { id: BlueprintId; exam: string }>> = {
  local: { id: 'nse', exam: 'Network Security Essentials' },
  'network-plus': { id: 'network-plus', exam: 'Network+ N10-009' },
};

const PHASE: Record<PlanPhase, string> = {
  learn: 'Learning phase: work through new material and re-answer what you miss.',
  review: 'Revision phase: mostly questions you have missed, and your weakest categories.',
  final: 'Final days: no new material. Re-answer missed questions and skim your flashcards.',
  today: 'Exam day. A light skim of your flashcards is plenty. Good luck.',
  past: 'This exam date has passed. Set your next one, or clear it.',
};

const longDate = (day: string) => parseDay(day)!.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export function loadExamDates(): ExamDates {
  const saved = readJSON<unknown>(EXAM_PLAN_KEY, {});
  return validExamDates(saved) ? saved : {};
}

/** The exam date for the current track, a countdown, and what to do today to be ready for it. */
export default function ExamPlanner({ history }: { history: readonly { questionId: number; isCorrect: boolean }[] }) {
  const { track } = useLearningTrack();
  const blueprint = BLUEPRINT[track];
  const [dates, setDates] = useState<ExamDates>(loadExamDates);
  const [editing, setEditing] = useState(false);
  const exam = dates[track];
  const [draft, setDraft] = useState(exam ?? '');
  useEffect(() => { setDraft(dates[track] ?? ''); setEditing(false); }, [track]);

  const save = (next: ExamDates) => { setDates(next); writeStudyValue(EXAM_PLAN_KEY, Object.keys(next).length ? JSON.stringify(next) : null); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (parseDay(draft)) { save({ ...dates, [track]: draft }); setEditing(false); } };
  const clear = () => { const { [track]: _, ...rest } = dates; save(rest); setDraft(''); setEditing(false); };

  const rows = useMemo(() => (blueprint ? examReadiness(history, blueprint.id).rows : []), [history, blueprint]);
  const plan = useMemo(() => (exam ? examPlan(exam, rows, READINESS_MIN_ANSWERS) : null), [exam, rows]);
  const title = blueprint ? blueprint.exam : 'your exam';

  if (!exam || editing) {
    return (
      <section className="exam-readiness exam-planner" aria-labelledby="exam-plan-title">
        <h3 id="exam-plan-title"><CalendarDays aria-hidden="true" />Exam plan</h3>
        <form className="exam-plan-form" onSubmit={submit}>
          <label>When do you sit {title}?
            <input type="date" value={draft} min={isoDay(new Date())} onChange={e => setDraft(e.target.value)} required />
          </label>
          <button type="submit" className="primary-button" disabled={!parseDay(draft)}>Plan my days</button>
          {editing && <button type="button" className="secondary-button" onClick={() => { setDraft(exam ?? ''); setEditing(false); }}>Cancel</button>}
        </form>
        <p>
          Your exam date turns your readiness into a daily target: how many questions to answer, from which{' '}
          {blueprint ? (track === 'network-plus' ? 'domains' : 'categories') : 'topics'}, and when to sit a mock exam.
          {!blueprint && ' WatchGuard Cloud has no published outline, so this track shows a countdown only.'}
        </p>
      </section>
    );
  }

  return (
    <section className="exam-readiness exam-planner" aria-labelledby="exam-plan-title">
      <h3 id="exam-plan-title"><CalendarDays aria-hidden="true" />Exam plan · {title} on {longDate(exam)}</h3>
      {plan && (
        <>
          <p className="readiness-summary">
            {plan.daysLeft > 0 && <><strong>{plan.daysLeft} day{plan.daysLeft === 1 ? '' : 's'}</strong> to go. </>}
            {PHASE[plan.phase]}
          </p>
          {plan.daily > 0 && blueprint && (
            <>
              <p className="exam-plan-today">
                Today: answer <strong>{plan.daily} questions</strong>, aiming for {PLAN_TARGET}% in every {track === 'network-plus' ? 'domain' : 'category'}.
                {plan.behind && ' Even this pace will not cover everything, so favour the top of the list.'}
              </p>
              <ul className="exam-plan-split">
                {plan.categories.filter(c => c.today > 0).map(c => (
                  <li key={c.domain}><span className="exam-plan-count">{c.today}</span><span><strong>{c.name}</strong> · {c.reason}</span></li>
                ))}
              </ul>
            </>
          )}
          {plan.daily > 0 && !blueprint && <p className="exam-plan-today">Answer at least <strong>{plan.daily} questions</strong> a day on this track.</p>}
          {(plan.nextMock || plan.finalMock) && blueprint && (
            <p className="exam-plan-mocks">
              {plan.nextMock && plan.nextMock !== plan.finalMock && <>Next mock exam: <strong>{longDate(plan.nextMock)}</strong>. </>}
              {plan.finalMock && <>Last full mock: <strong>{longDate(plan.finalMock)}</strong>, leaving a day to act on it.</>}
            </p>
          )}
        </>
      )}
      <div className="exam-plan-actions">
        <button type="button" className="secondary-button" onClick={() => { setDraft(exam); setEditing(true); }}>Change date</button>
        <button type="button" className="secondary-button" onClick={clear}>Clear</button>
      </div>
    </section>
  );
}
