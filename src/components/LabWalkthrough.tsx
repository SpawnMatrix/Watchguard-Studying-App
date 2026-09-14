import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle, ChevronRight, FlaskConical, HelpCircle, Layers, RefreshCw, RotateCcw, ShieldCheck, Terminal, Trophy } from "lucide-react";
import { watchguardLabs, labCategories, orderLabs, Lab, LabCategory, LabSort } from "../data/labs";
import { checkpointFor } from "../data/labCheckpoints";
import { entryFor, furthestReachable, isLabFinished, LAB_PROGRESS_KEY, markStepDone, resetLab, setResumeStep, validLabProgress, type LabProgress } from "../engine/labProgress";
import { readJSON, writeStudyValue } from "../account/storage";
import { motion, AnimatePresence } from "motion/react";
import { handleError } from "../utils/errorHandler";
import LabCheckpointCard, { type CheckpointAttempt } from "./LabCheckpointCard";
import { handsOnLabs, simForStep } from "../data/labTasks";
import { simReduce, type FireboxSim, type PageId, type SimAction } from "../engine/labSim";
import FireboxSimulator, { pageLabel } from "./labsim/FireboxSimulator";

interface LabWalkthroughProps {
  onLabCompleted: (labId: number, name: string) => void;
  /** Lab names already recorded as complete in study progress, including before step tracking existed. */
  completedLabs?: readonly string[];
}

function loadProgress(): LabProgress {
  const saved = readJSON<unknown>(LAB_PROGRESS_KEY, {});
  return validLabProgress(saved) ? saved : {};
}

export default function LabWalkthrough({ onLabCompleted, completedLabs = [] }: LabWalkthroughProps) {
  const labs: Lab[] = watchguardLabs;
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<LabSort>("number");
  const [categoryFilter, setCategoryFilter] = useState<"All" | LabCategory>("All");
  const [singleFireboxOnly, setSingleFireboxOnly] = useState(false);
  const [progress, setProgress] = useState<LabProgress>(loadProgress);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  // Checkpoint answers for the lab that is open. Session-only: a saved step is already "passed".
  const [attempts, setAttempts] = useState<Record<number, CheckpointAttempt | null>>({});
  const [missedSteps, setMissedSteps] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  // The simulated Firebox for hands-on labs. It is not saved: reopening a lab rebuilds it from step progress.
  const [sim, setSim] = useState<FireboxSim | null>(null);
  const [simPage, setSimPage] = useState<PageId>("bench");

  // Stuck sub-routine state
  const [isStuckMode, setIsStuckMode] = useState(false);
  const [technicianIssue, setTechnicianIssue] = useState("");
  const [stuckDiagnosis, setStuckDiagnosis] = useState<{
    analysis: string;
    suggestedCommand: string;
    simulatedLogs: string[];
    isDemoMode?: boolean;
  } | null>(null);
  const [isDiagnosing, setIsLoadingDiagnosis] = useState(false);

  useEffect(() => { writeStudyValue(LAB_PROGRESS_KEY, JSON.stringify(progress)); }, [progress]);

  // Twenty labs across seven categories, eight of which need kit beyond one Firebox, so the
  // catalogue is browsed rather than just scrolled. Lab number is the default order because the
  // Lab Book is numbered that way and the exam follows it.
  const visibleLabs = useMemo(
    () => orderLabs(labs, { sortBy, category: categoryFilter, singleFireboxOnly }),
    [labs, sortBy, categoryFilter, singleFireboxOnly]);

  const activeLab = labs.find(l => l.id === selectedLabId);
  const entry = activeLab ? entryFor(progress, activeLab) : null;
  const activeStep = activeLab?.steps[activeStepIdx];
  const checkpoint = activeLab && activeStep ? checkpointFor(activeLab.id, activeStep.stepNumber) : undefined;
  const attempt = attempts[activeStepIdx] ?? null;
  const stepDone = !!entry?.done.includes(activeStepIdx);
  const handsOn = activeLab ? handsOnLabs[activeLab.id] : undefined;
  const task = handsOn && activeStep ? handsOn.tasks[activeStep.stepNumber] : undefined;
  const taskDone = !!task && !!sim && task.check(sim);
  // A step with a checkpoint needs a correct answer, or a pass saved from an earlier visit. A hands-on
  // step also needs its simulator task verified, so the lab cannot be clicked through without doing it.
  const canComplete = (!checkpoint || stepDone || !!attempt?.correct) && (!task || stepDone || taskDone);
  const simDispatch = (action: SimAction) => setSim(prev => (prev ? simReduce(prev, action) : prev));
  const pageForStep = (lab: Lab, index: number): PageId => handsOnLabs[lab.id]?.tasks[lab.steps[index]?.stepNumber]?.page ?? "bench";
  const isLastStep = !!activeLab && activeStepIdx + 1 === activeLab.steps.length;
  const reachable = activeLab ? furthestReachable(progress, activeLab) : 0;

  const clearStuck = () => {
    setIsStuckMode(false);
    setStuckDiagnosis(null);
    setTechnicianIssue("");
  };

  const handleSelectLab = (id: number) => {
    const lab = labs.find(l => l.id === id);
    if (!lab) return;
    const start = entryFor(progress, lab).step;
    setSelectedLabId(id);
    setActiveStepIdx(start);
    setSim(simForStep(lab.id, start));
    setSimPage(pageForStep(lab, start));
    setAttempts({});
    setMissedSteps([]);
    setShowSummary(isLabFinished(progress, lab));
    clearStuck();
  };

  const goToStep = (index: number) => {
    if (!activeLab || index < 0 || index > reachable) return;
    setActiveStepIdx(index);
    setSimPage(pageForStep(activeLab, index));
    setProgress(p => setResumeStep(p, activeLab, index));
    setShowSummary(false);
    clearStuck();
  };

  const handleAnswer = (choice: string) => {
    if (!checkpoint) return;
    const correct = choice === checkpoint.answer;
    setAttempts(a => ({ ...a, [activeStepIdx]: { choice, correct } }));
    if (!correct && !missedSteps.includes(activeStepIdx)) setMissedSteps(m => [...m, activeStepIdx]);
  };

  const handleStepComplete = () => {
    if (!activeLab || !canComplete) return;
    const next = markStepDone(progress, activeLab, activeStepIdx);
    setProgress(next);

    if (!isLastStep) {
      setActiveStepIdx(activeStepIdx + 1);
      setSimPage(pageForStep(activeLab, activeStepIdx + 1));
      clearStuck();
    } else if (isLabFinished(next, activeLab)) {
      onLabCompleted(activeLab.id, activeLab.name);
      setShowSummary(true);
      clearStuck();
    } else {
      // Last step passed, but an earlier one was never completed: send them back to it.
      setActiveStepIdx(furthestReachable(next, activeLab));
    }
  };

  const handleRedoLab = () => {
    if (!activeLab) return;
    setProgress(p => resetLab(p, activeLab));
    setActiveStepIdx(0);
    setSim(simForStep(activeLab.id, 0));
    setSimPage(pageForStep(activeLab, 0));
    setAttempts({});
    setMissedSteps([]);
    setShowSummary(false);
    clearStuck();
  };

  // Retrying sets an attempt back to null but keeps its key, so this counts steps answered at least once.
  const answeredThisVisit = Object.keys(attempts).length;
  const nextLab = activeLab ? orderLabs(labs, { sortBy: "number", category: "All", singleFireboxOnly: false }).find(l => l.id > activeLab.id) : undefined;

  const handleDiagnose = async () => {
    if (!activeLab || !activeStep || !technicianIssue.trim() || isDiagnosing) return;
    setIsLoadingDiagnosis(true);

    try {
      const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (customKey) {
        headers["X-Gemini-API-Key"] = customKey;
      }

      const response = await fetch("/api/lab/diagnostic", {
        method: "POST",
        headers,
        body: JSON.stringify({
          labName: activeLab.name,
          stepTitle: activeStep.title,
          stepInstruction: activeStep.instruction,
          technicianIssue: technicianIssue
        })
      });

      if (!response.ok) {
        throw new Error("Diagnostic API error.");
      }

      const diag = await response.json();
      setStuckDiagnosis(diag);
    } catch (error) {
      handleError("Diagnostic error", error);
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  const labStatus = (lab: Lab) => {
    const { done } = entryFor(progress, lab);
    if (done.length >= lab.steps.length || completedLabs.includes(lab.name)) return { label: "Completed", complete: true };
    if (done.length > 0) return { label: `${done.length}/${lab.steps.length} steps`, complete: false };
    return null;
  };

  return (
    /* Both columns are capped to the viewport on large screens. The grid row stretches to the
       tallest column, so without this the 20-lab catalogue drove the row to ~2900px and the
       step-completion footer ended up far below the fold with empty space above it. Each
       column scrolls inside itself instead. */
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-6 h-full">
      {/* Labs Catalog / Left Navigation */}
      {/* A hands-on lab needs the width for the simulator, so the catalogue steps aside until Back to Catalog. */}
      <div className={`${handsOn ? "hidden" : ""} lg:col-span-4 bg-watchguard-gray border border-watchguard-border rounded-xl p-4 shadow-xl flex flex-col h-full lg:max-h-[calc(100vh-8rem)]`}>
        <h3 className="font-display font-semibold text-white border-b border-watchguard-border pb-3 mb-3 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-watchguard-orange" />
            <span>NSE Lab Catalog</span>
          </span>
          <span className="font-sans text-[10px] font-normal text-gray-500 tabular-nums">
            {visibleLabs.length === labs.length ? `${labs.length} labs` : `${visibleLabs.length} of ${labs.length}`}
          </span>
        </h3>

        <div className="quiz-filters lab-catalog-filters grid grid-cols-2 gap-2 mb-2">
          <select aria-label="Sort labs" value={sortBy} onChange={e => setSortBy(e.target.value as LabSort)}>
            <option value="number">By number</option>
            <option value="category">By category</option>
            <option value="name">By name</option>
          </select>
          <select aria-label="Filter labs by category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as "All" | LabCategory)}>
            <option value="All">All categories</option>
            {labCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <label className="flex items-center space-x-2 mb-3 text-[10px] text-gray-400 cursor-pointer select-none">
          <input type="checkbox" className="accent-watchguard-orange" checked={singleFireboxOnly}
            onChange={e => setSingleFireboxOnly(e.target.checked)} />
          <span>Only labs that need one Firebox</span>
        </label>

        <div className="flex-1 overflow-y-auto space-y-2.5">
          {visibleLabs.map((lab) => {
            const isSelected = lab.id === selectedLabId;
            const status = labStatus(lab);
            return (
              <button
                key={lab.id}
                onClick={() => handleSelectLab(lab.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-sans select-none flex items-start space-x-3 ${
                  isSelected
                    ? "bg-watchguard-orange/10 border-watchguard-orange text-white"
                    : "bg-watchguard-dark/40 border-watchguard-border text-gray-400 hover:border-watchguard-border hover:bg-watchguard-lightgray/30"
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center border font-mono text-[10px] ${
                  status?.complete ? "bg-green-600 text-white border-green-600" :
                  isSelected ? "bg-watchguard-orange text-white border-watchguard-orange" : "bg-watchguard-lightgray border-watchguard-border text-gray-400"
                }`}>
                  {status?.complete ? <CheckCircle className="w-3 h-3" aria-hidden="true" /> : lab.id}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h4 className={`font-semibold ${isSelected ? "text-watchguard-orange" : "text-gray-200"}`}>{lab.name}</h4>
                  <p className="text-[10px] uppercase tracking-wide text-gray-600">
                    {lab.category}{lab.requiresExtraKit ? " · needs extra kit" : ""}{handsOnLabs[lab.id] ? " · hands-on" : ""}
                    {status && <span className={`lab-status-tag ${status.complete ? "is-complete" : ""}`}>{status.label}</span>}
                  </p>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{lab.objectives}</p>
                </div>
              </button>
            );
          })}
          {visibleLabs.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-8 text-center leading-relaxed">
              No labs match these filters. Clear the category, or allow labs that need more than one Firebox.
            </p>
          )}
        </div>
      </div>

      {/* Lab Simulation & Guidance Engine / Right Stage */}
      <div className={`${handsOn ? "lg:col-span-12" : "lg:col-span-8"} flex flex-col h-full lg:max-h-[calc(100vh-8rem)] bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl min-w-0`}>
        {!activeLab || !activeStep || !entry ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="p-4 bg-watchguard-orange/5 border border-watchguard-orange/15 rounded-full">
              <ShieldCheck className="w-10 h-10 text-watchguard-orange animate-pulse-soft" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="font-display font-semibold text-white">Pick a lab to start</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Each step tells you what to do on a Firebox, then asks a checkpoint question about it. Labs marked hands-on include a simulated Firebox and management PC, so you configure it and the lab checks your work. Progress saves as you go.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Lab Metadata Header */}
            <div className="px-5 py-4 bg-watchguard-lightgray border-b border-watchguard-border space-y-3">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-semibold text-white text-sm sm:text-base">{activeLab.name}</h2>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{activeLab.objectives}</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed"><span className="text-gray-400 font-semibold">You need:</span> {activeLab.prerequisites}</p>
                </div>
                <button
                  onClick={() => setSelectedLabId(null)}
                  className="text-[11px] font-mono text-watchguard-orange hover:underline bg-watchguard-dark border border-watchguard-border px-2.5 py-1 rounded shrink-0"
                >
                  Back to Catalog
                </button>
              </div>
              {/* Step tracker: passed steps and the next one are reachable; later steps wait. */}
              <ol className="lab-stepper" aria-label="Lab steps">
                {activeLab.steps.map((step, index) => {
                  const done = entry.done.includes(index);
                  const current = !showSummary && index === activeStepIdx;
                  return (
                    <li key={step.stepNumber}>
                      <button type="button" disabled={index > reachable} onClick={() => goToStep(index)}
                        aria-current={current ? "step" : undefined}
                        aria-label={`Step ${step.stepNumber}: ${step.title}${done ? ", completed" : index > reachable ? ", locked until earlier steps are done" : ""}`}
                        className={`lab-stepper-dot ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}>
                        {done ? <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> : step.stepNumber}
                      </button>
                    </li>
                  );
                })}
                <li className="lab-stepper-count">{entry.done.length} of {activeLab.steps.length} steps done</li>
              </ol>
            </div>

            {showSummary ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="lab-summary" role="status">
                  <Trophy className="w-10 h-10 text-watchguard-orange" aria-hidden="true" />
                  <h3 className="font-display font-semibold text-white text-lg">Lab complete</h3>
                  <p className="text-sm text-gray-300">
                    {/* Only checkpoints answered in this visit count; steps passed in an earlier session have no attempt to judge. */}
                    {answeredThisVisit === 0
                      ? `All ${activeLab.steps.length} steps are complete.`
                      : missedSteps.length === 0
                        ? `All ${answeredThisVisit} checkpoints you answered were right first time.`
                        : `${answeredThisVisit - missedSteps.length} of ${answeredThisVisit} checkpoints right first time. Worth revisiting: ${[...missedSteps].sort((a, b) => a - b).map(i => activeLab.steps[i].title).join(", ")}.`}
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {nextLab && <button type="button" className="primary-button" onClick={() => handleSelectLab(nextLab.id)}>Next: {nextLab.name}<ChevronRight className="w-4 h-4" /></button>}
                    <button type="button" className="secondary-button" onClick={() => goToStep(0)}>Review steps</button>
                    <button type="button" className="secondary-button" onClick={handleRedoLab}><RotateCcw className="w-4 h-4" />Redo lab from scratch</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Active Walkthrough Stage. Hands-on labs put the simulated Firebox beside the steps. */}
                <div className={handsOn ? "lab-handson" : "flex-1 flex flex-col min-h-0"}>
                <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                  {handsOn && <p className="lab-briefing"><FlaskConical className="w-4 h-4" aria-hidden="true" /> {handsOn.briefing}</p>}
                  {/* Step Display Card */}
                  <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-watchguard-orange"></div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-mono font-semibold text-watchguard-orange bg-watchguard-orange/15 border border-watchguard-orange/30 px-2 py-1 rounded uppercase tracking-wider">
                          Step {activeStepIdx + 1} of {activeLab.steps.length}
                        </span>
                        {stepDone && (
                          <span className="flex items-center space-x-1 text-xs text-green-400 font-mono font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-white text-sm sm:text-base">{activeStep.title}</h3>
                      <p className="text-gray-300 text-sm leading-relaxed font-sans">{activeStep.instruction}</p>
                    </div>
                  </div>

                  {task && sim && (
                    <section className={`lab-task ${taskDone || stepDone ? "is-done" : ""}`} aria-label="Hands-on task">
                      <div className="lab-task-head">
                        <FlaskConical className="w-4 h-4" aria-hidden="true" />
                        <h4>Do it in the simulator</h4>
                        <span className="lab-task-status" role="status">{taskDone ? "✓ Verified" : stepDone ? "Completed earlier" : "Not done yet"}</span>
                      </div>
                      <p>{task.goal}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="secondary-button" onClick={() => setSimPage(task.page)}>Open {pageLabel(task.page)}</button>
                        <button type="button" className="secondary-button" onClick={() => { setSim(simForStep(activeLab.id, activeStepIdx)); setSimPage(task.page); }}><RefreshCw className="w-4 h-4" />Reset simulator to this step</button>
                      </div>
                    </section>
                  )}

                  {checkpoint && (
                    <LabCheckpointCard
                      checkpoint={checkpoint}
                      seed={activeLab.id * 100 + activeStep.stepNumber}
                      attempt={attempt}
                      passedEarlier={stepDone}
                      onAnswer={handleAnswer}
                      onRetry={() => setAttempts(a => ({ ...a, [activeStepIdx]: null }))}
                    />
                  )}

                  {/* Troubleshooting sub-routine */}
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setIsStuckMode(!isStuckMode)}
                      aria-expanded={isStuckMode}
                      className="flex items-center gap-2 text-xs font-semibold text-watchguard-orange bg-watchguard-orange/10 hover:bg-watchguard-orange/20 border border-watchguard-orange/30 px-3 py-2 rounded-lg transition-all"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {isStuckMode ? "Close troubleshooting help" : "Stuck on this step on a real Firebox?"}
                    </button>

                    <AnimatePresence>
                      {isStuckMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          <div className="p-4 bg-watchguard-lightgray rounded-xl border border-watchguard-border space-y-3">
                            <label htmlFor="lab-issue" className="block text-xs text-gray-400 leading-normal">
                              Describe what failed (for example, 'ping still times out after adding the static route' or 'certificate warnings in my browser'):
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              <input
                                id="lab-issue"
                                type="text"
                                value={technicianIssue}
                                onChange={(e) => setTechnicianIssue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleDiagnose(); }}
                                placeholder="What went wrong?"
                                className="flex-1 min-w-[12rem] bg-watchguard-dark text-white border border-watchguard-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-watchguard-orange font-sans placeholder:text-gray-600"
                              />
                              <button
                                type="button"
                                onClick={handleDiagnose}
                                disabled={!technicianIssue.trim() || isDiagnosing}
                                className="bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-all border border-watchguard-orange/40"
                              >
                                {isDiagnosing ? "Diagnosing…" : "Get help"}
                              </button>
                            </div>
                          </div>

                          {/* Diagnostic Outputs & Interactive Log Consoles */}
                          {stuckDiagnosis && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              <div className="bg-watchguard-lightgray border border-watchguard-border rounded-xl p-4 space-y-3 shadow-lg">
                                <h4 className="font-display font-semibold text-watchguard-orange text-xs flex items-center space-x-1.5">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>WHAT TO CHECK</span>
                                </h4>
                                {stuckDiagnosis.isDemoMode && (
                                  <p className="text-[11px] text-gray-500">General guidance matched to your description. AI diagnosis is turned off on this portal.</p>
                                )}
                                <div className="text-gray-300 text-xs leading-relaxed space-y-2 select-text font-sans">
                                  {stuckDiagnosis.analysis.split("\n").map((line, idx) => (
                                    <p key={idx}>{line.replace(/\*\*/g, "")}</p>
                                  ))}
                                </div>
                                <div className="pt-2 border-t border-watchguard-border">
                                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Suggested verification:</span>
                                  <code className="text-xs text-watchguard-orange font-mono select-all block mt-1 bg-watchguard-dark px-2 py-1 rounded border border-watchguard-border/50">
                                    {stuckDiagnosis.suggestedCommand}
                                  </code>
                                </div>
                              </div>

                              <div className="bg-watchguard-dark border border-watchguard-border rounded-xl p-4 flex flex-col font-mono text-[10px] shadow-lg relative overflow-hidden">
                                <div className="flex items-center justify-between border-b border-watchguard-border pb-2 mb-2 text-[9px] text-gray-500">
                                  <span className="flex items-center space-x-1">
                                    <Terminal className="w-3 h-3 text-watchguard-orange" />
                                    <span>EXAMPLE LOG LINES</span>
                                  </span>
                                  <span>Illustrative</span>
                                </div>
                                <div className="flex-1 space-y-1.5 select-all overflow-y-auto max-h-[140px] pr-2">
                                  {stuckDiagnosis.simulatedLogs.map((log, idx) => (
                                    <div key={idx} className="text-gray-400 bg-watchguard-lightgray/10 p-1.5 rounded border border-watchguard-border/20 leading-relaxed break-all">
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {handsOn && sim && (
                  <div className="lab-handson-sim">
                    <FireboxSimulator s={sim} dispatch={simDispatch} page={simPage} onPage={setSimPage} />
                  </div>
                )}
                </div>

                {/* Step Completion Footer: the primary action sits first so it is never pushed off the
                    right-hand edge of a narrow or partly covered window. */}
                <div className="px-5 py-3 bg-watchguard-lightgray border-t border-watchguard-border flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleStepComplete}
                    disabled={!canComplete}
                    title={canComplete ? undefined : task && !taskDone && !stepDone ? "Complete the simulator task and answer the checkpoint first" : "Answer the checkpoint correctly first"}
                    className="flex items-center space-x-2 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg text-white font-semibold transition-all border border-watchguard-orange/40"
                  >
                    <span>{isLastStep ? "Complete Lab Exercise" : "Confirm Completion & Proceed"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(activeStepIdx - 1)}
                    disabled={activeStepIdx === 0}
                    className="secondary-button disabled:opacity-40"
                  >
                    <ArrowLeft className="w-4 h-4" />Previous step
                  </button>
                  <span className="text-xs text-gray-400" role="status">
                    {stepDone ? "✓ Step complete" : canComplete ? "Ready to complete" : task && !taskDone ? "Complete the simulator task and the checkpoint to finish this step" : "Answer the checkpoint to complete this step"}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
