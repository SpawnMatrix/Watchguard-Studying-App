import { useMemo } from "react";
import { CheckCircle, HelpCircle, XCircle } from "lucide-react";
import type { LabCheckpoint } from "../data/labCheckpoints";
import { seededRandom, shuffle } from "../engine/random";

export interface CheckpointAttempt {
  choice: string;
  correct: boolean;
}

interface Props {
  checkpoint: LabCheckpoint;
  /** Stable per lab step, so the option order does not reshuffle on every render or revisit. */
  seed: number;
  attempt: CheckpointAttempt | null;
  passedEarlier: boolean;
  onAnswer: (choice: string) => void;
  onRetry: () => void;
}

/**
 * The question a learner answers before a lab step counts as done.
 *
 * A wrong answer shows the reasoning and lets them try again; the step still cannot be completed
 * until they get it right, because moving on past a step you misunderstood is exactly what a lab is
 * meant to catch.
 */
export default function LabCheckpointCard({ checkpoint, seed, attempt, passedEarlier, onAnswer, onRetry }: Props) {
  const options = useMemo(() => shuffle(checkpoint.options, seededRandom(seed)), [checkpoint, seed]);
  const locked = !!attempt;

  return (
    <section className="lab-checkpoint" aria-labelledby={`checkpoint-${seed}`}>
      <div className="lab-checkpoint-head">
        <HelpCircle className="w-4 h-4" aria-hidden="true" />
        <h4 id={`checkpoint-${seed}`}>Checkpoint</h4>
        {passedEarlier && !attempt && <span className="lab-checkpoint-earlier">Passed earlier · answer again to refresh it</span>}
      </div>
      <p className="lab-checkpoint-question">{checkpoint.question}</p>
      <div className="lab-checkpoint-options" role="group" aria-label="Checkpoint answers">
        {options.map(option => {
          const chosen = attempt?.choice === option;
          const state = !attempt ? "" : option === checkpoint.answer && attempt.correct ? "is-correct" : chosen ? "is-incorrect" : "";
          return (
            <button key={option} type="button" className={`lab-checkpoint-option ${state}`} disabled={locked}
              aria-pressed={chosen} onClick={() => onAnswer(option)}>
              {option}
            </button>
          );
        })}
      </div>
      {attempt && (
        <div className={`lab-checkpoint-result ${attempt.correct ? "is-correct" : "is-incorrect"}`} role="status">
          <p className="lab-checkpoint-verdict">
            {attempt.correct
              ? <><CheckCircle className="w-4 h-4" aria-hidden="true" /> Correct. This step is ready to complete.</>
              : <><XCircle className="w-4 h-4" aria-hidden="true" /> Not quite. Read why, then try again.</>}
          </p>
          <p>{checkpoint.why}</p>
          {!attempt.correct && <button type="button" className="secondary-button" onClick={onRetry}>Try again</button>}
        </div>
      )}
    </section>
  );
}
