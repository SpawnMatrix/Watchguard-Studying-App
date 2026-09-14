import { CheckCircle, ChevronRight, FlaskConical, PlayCircle, ShieldCheck } from "lucide-react";
import type { Lab } from "../data/labs";
import { entryFor, type LabProgress } from "../engine/labProgress";

interface LabOverviewProps {
  labs: readonly Lab[];
  progress: LabProgress;
  /** Lab names recorded as complete in study progress, including before step tracking existed. */
  completedLabs: readonly string[];
  handsOnIds: readonly number[];
  onSelect: (id: number) => void;
}

export type LabState = { complete: boolean; done: number };

export function labState(progress: LabProgress, lab: Lab, completedLabs: readonly string[]): LabState {
  const { done } = entryFor(progress, lab);
  return { complete: done.length >= lab.steps.length || completedLabs.includes(lab.name), done: done.length };
}

/**
 * What the lab stage shows before a lab is open. It used to be an empty "Pick a lab" panel; now it
 * answers where the learner is and offers the obvious next move, so a returning learner is one click
 * from the step they left off at.
 */
export default function LabOverview({ labs, progress, completedLabs, handsOnIds, onSelect }: LabOverviewProps) {
  const byNumber = [...labs].sort((a, b) => a.id - b.id);
  const states = new Map(byNumber.map(lab => [lab.id, labState(progress, lab, completedLabs)]));
  const complete = byNumber.filter(lab => states.get(lab.id)!.complete);
  const inProgress = byNumber.filter(lab => !states.get(lab.id)!.complete && states.get(lab.id)!.done > 0);
  const next = byNumber.find(lab => !states.get(lab.id)!.complete && states.get(lab.id)!.done === 0);
  const resume = inProgress[0];
  const handsOn = byNumber.filter(lab => handsOnIds.includes(lab.id));
  const percent = Math.round((complete.length / Math.max(1, labs.length)) * 100);

  return (
    <div className="lab-overview">
      <div className="lab-overview-head">
        <span className="lab-overview-icon"><ShieldCheck aria-hidden="true" /></span>
        <div>
          <h3>Your lab bench</h3>
          <p>
            {complete.length} of {labs.length} labs complete
            {inProgress.length > 0 && ` · ${inProgress.length} in progress`}
          </p>
        </div>
      </div>
      <progress className="lab-overview-meter" max={100} value={percent} aria-label={`${percent}% of labs complete`} />

      <div className="lab-overview-actions">
        {resume && (
          <button type="button" className="lab-overview-action is-primary" onClick={() => onSelect(resume.id)}>
            <PlayCircle aria-hidden="true" />
            <span>
              <strong>Resume {resume.name}</strong>
              <small>{states.get(resume.id)!.done} of {resume.steps.length} steps done</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        )}
        {next && (
          <button type="button" className={`lab-overview-action${resume ? "" : " is-primary"}`} onClick={() => onSelect(next.id)}>
            <FlaskConical aria-hidden="true" />
            <span>
              <strong>{resume ? "Or start" : "Start"} {next.name}</strong>
              <small>{next.category}{next.requiresExtraKit ? " · needs extra kit" : ""}{handsOnIds.includes(next.id) ? " · hands-on" : ""}</small>
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        )}
        {!resume && !next && (
          <p className="lab-overview-done">
            <CheckCircle aria-hidden="true" />
            Every lab is complete. Redo a hands-on lab before the exam to keep the configuration steps fresh.
          </p>
        )}
      </div>

      {handsOn.length > 0 && (
        <section className="lab-overview-handson" aria-labelledby="lab-overview-handson-title">
          <h4 id="lab-overview-handson-title">Hands-on labs with a simulated Firebox</h4>
          <ul>
            {handsOn.map(lab => {
              const state = states.get(lab.id)!;
              return (
                <li key={lab.id}>
                  <button type="button" onClick={() => onSelect(lab.id)}>
                    <span className={`lab-overview-number${state.complete ? " is-complete" : ""}`}>
                      {state.complete ? <CheckCircle aria-label="Complete" /> : lab.id}
                    </span>
                    <span className="lab-overview-name">{lab.name.replace(/^Lab \d+:\s*/, "")}</span>
                    {!state.complete && state.done > 0 && <small>{state.done}/{lab.steps.length}</small>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="lab-overview-help">
        Each step tells you what to do on a Firebox, then asks a checkpoint question about it. Hands-on labs include a simulated
        Firebox and management PC, so you configure it and the lab checks your work. Progress saves as you go.
      </p>
    </div>
  );
}
