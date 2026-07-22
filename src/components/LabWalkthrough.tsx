import { errorHandler } from "../utils/errorHandler";
import { useState } from "react";
import { Play, Check, AlertCircle, HelpCircle, Terminal, RefreshCw, Layers, ShieldCheck, ChevronRight, CheckCircle } from "lucide-react";
import { watchguardLabs, Lab, LabStep } from "../data/labs";
import { motion, AnimatePresence } from "motion/react";
import { handleError } from "../utils/errorHandler";

interface LabWalkthroughProps {
  onLabCompleted: (labId: number, name: string) => void;
}

export default function LabWalkthrough({ onLabCompleted }: LabWalkthroughProps) {
  const [labs, setLabs] = useState<Lab[]>(watchguardLabs);
  const [selectedLabId, setSelectedLabId] = useState<number | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]); // indexes of steps completed
  
  // Stuck sub-routine state
  const [isStuckMode, setIsStuckMode] = useState(false);
  const [technicianIssue, setTechnicianIssue] = useState("");
  const [stuckDiagnosis, setStuckDiagnosis] = useState<{
    analysis: string;
    suggestedCommand: string;
    simulatedLogs: string[];
    isDemo?: boolean;
  } | null>(null);
  const [isDiagnosing, setIsLoadingDiagnosis] = useState(false);

  const activeLab = labs.find(l => l.id === selectedLabId);

  const handleSelectLab = (id: number) => {
    setSelectedLabId(id);
    setActiveStepIdx(0);
    setCompletedSteps([]);
    setIsStuckMode(false);
    setStuckDiagnosis(null);
    setTechnicianIssue("");
  };

  const handleStepComplete = () => {
    if (!activeLab) return;
    if (!completedSteps.includes(activeStepIdx)) {
      setCompletedSteps(prev => [...prev, activeStepIdx]);
    }

    if (activeStepIdx + 1 < activeLab.steps.length) {
      setActiveStepIdx(prev => prev + 1);
      setIsStuckMode(false);
      setStuckDiagnosis(null);
      setTechnicianIssue("");
    } else {
      // Completed last step of lab
      onLabCompleted(activeLab.id, activeLab.name);
    }
  };

  const handleDiagnose = async () => {
    if (!activeLab || !technicianIssue.trim() || isDiagnosing) return;
    setIsLoadingDiagnosis(true);

    const activeStep = activeLab.steps[activeStepIdx];

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

  return (
    <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-6 h-full">
      {/* Labs Catalog / Left Navigation */}
      <div className="lg:col-span-4 bg-watchguard-gray border border-watchguard-border rounded-xl p-4 shadow-xl flex flex-col h-full ">
        <h3 className="font-display font-semibold text-white border-b border-watchguard-border pb-3 mb-4 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-watchguard-orange" />
          <span>NSE Lab Catalog</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2.5">
          {labs.map((lab) => {
            const isSelected = lab.id === selectedLabId;
            return (
              <button
                key={lab.id}
                onClick={() => handleSelectLab(lab.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-sans select-none flex items-start space-x-3 ${
                  isSelected 
                    ? "bg-watchguard-orange/10 border-watchguard-orange text-white" 
                    : "bg-watchguard-dark/40 border-watchguard-border text-gray-400 hover:border-watchguard-border hover:bg-watchguard-lightgray/30"
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border font-mono text-[10px] ${
                  isSelected ? "bg-watchguard-orange text-white border-watchguard-orange" : "bg-watchguard-lightgray border-watchguard-border text-gray-400"
                }`}>
                  {lab.id}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className={`font-semibold ${isSelected ? "text-watchguard-orange" : "text-gray-200"}`}>{lab.name}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{lab.objectives}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lab Simulation & Guidance Engine / Right Stage */}
      <div className="lg:col-span-8 flex flex-col h-full bg-watchguard-gray border border-watchguard-border rounded-xl overflow-hidden shadow-2xl ">
        {!selectedLabId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="p-4 bg-watchguard-orange/5 border border-watchguard-orange/15 rounded-full">
              <ShieldCheck className="w-10 h-10 text-watchguard-orange animate-pulse-soft" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-display font-semibold text-white">Select a Certified Lab Exercise</h3>
              <p className="text-xs text-gray-500 leading-normal">
                Guide your peer through standard WatchGuard system layouts step-by-step. Get troubleshooting assistance and Traffic Monitor debug checkpoints.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Lab Metadata Header */}
            <div className="px-6 py-4 bg-watchguard-lightgray border-b border-watchguard-border flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-display font-semibold text-white text-sm sm:text-base">{activeLab?.name}</h2>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">Objectives: {activeLab?.objectives}</p>
              </div>
              <button 
                onClick={() => setSelectedLabId(null)}
                className="text-[10px] font-mono text-watchguard-orange hover:underline bg-watchguard-dark border border-watchguard-border px-2.5 py-1 rounded"
              >
                Back to Catalog
              </button>
            </div>

            {/* Active Walkthrough Stage */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Step Display Card */}
              <div className="bg-watchguard-dark/60 border border-watchguard-border rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-watchguard-orange"></div>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold text-watchguard-orange bg-watchguard-orange/15 border border-watchguard-orange/30 px-2 py-1 rounded uppercase tracking-wider">
                      Active Step {activeStepIdx + 1} of {activeLab?.steps.length}
                    </span>
                    {completedSteps.includes(activeStepIdx) && (
                      <span className="flex items-center space-x-1 text-xs text-green-400 font-mono font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-semibold text-white text-sm sm:text-base">
                    {activeLab?.steps[activeStepIdx].title}
                  </h3>

                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans">
                    {activeLab?.steps[activeStepIdx].instruction}
                  </p>
                </div>
              </div>

              {/* Troubleshooting sub-routine */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-watchguard-orange" />
                    <span className="text-xs font-semibold text-white">Stuck on this step? Diagnose now:</span>
                  </div>
                  <button
                    onClick={() => setIsStuckMode(!isStuckMode)}
                    className="text-[10px] font-mono bg-watchguard-orange/10 hover:bg-watchguard-orange/20 text-watchguard-orange border border-watchguard-orange/30 px-3 py-1.5 rounded transition-all"
                  >
                    {isStuckMode ? "Close Diagnostic Tool" : "🚨 I'm Stuck!"}
                  </button>
                </div>

                <AnimatePresence>
                  {isStuckMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-4"
                    >
                      <div className="p-4 bg-watchguard-lightgray rounded-xl border border-watchguard-border space-y-3">
                        <p className="text-xs text-gray-400 leading-normal">
                          Describe what failed in your configuration (e.g., 'ping is still timing out after setting up static route' or 'SSL certificate warnings show up on my browser'):
                        </p>
                        <div className="flex items-center space-x-3">
                          <input
                            type="text"
                            value={technicianIssue}
                            onChange={(e) => setTechnicianIssue(e.target.value)}
                            placeholder="Describe diagnostic issue..."
                            className="flex-1 bg-watchguard-dark text-white border border-watchguard-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-watchguard-orange font-sans placeholder:text-gray-600"
                          />
                          <button
                            onClick={handleDiagnose}
                            disabled={!technicianIssue.trim() || isDiagnosing}
                            className="bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-dark disabled:border-watchguard-border text-white text-xs px-4 py-2 rounded-lg font-semibold transition-all border border-watchguard-orange/40"
                          >
                            {isDiagnosing ? "Analyzing Topology..." : "Run Diagnose"}
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
                          {/* Diagnostic Analysis */}
                          <div className="bg-watchguard-lightgray border border-watchguard-border rounded-xl p-4.5 space-y-3 shadow-lg">
                            <h4 className="font-display font-semibold text-watchguard-orange text-xs flex items-center space-x-1.5">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>AUDITOR ANALYSIS</span>
                            </h4>
                            <div className="text-gray-300 text-xs leading-relaxed space-y-2 select-text font-sans">
                              {stuckDiagnosis.analysis.split("\n").map((line, idx) => (
                                <p key={idx}>{line}</p>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-watchguard-border">
                              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Suggested Verification:</span>
                              <code className="text-xs text-watchguard-orange font-mono select-all block mt-1 bg-watchguard-dark px-2 py-1 rounded border border-watchguard-border/50">
                                {stuckDiagnosis.suggestedCommand}
                              </code>
                            </div>
                          </div>

                          {/* Live simulated console */}
                          <div className="bg-watchguard-dark border border-watchguard-border rounded-xl p-4 flex flex-col font-mono text-[10px] shadow-lg relative overflow-hidden">
                            <div className="flex items-center justify-between border-b border-watchguard-border pb-2 mb-2 text-[9px] text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Terminal className="w-3 h-3 text-watchguard-orange" />
                                <span>FSM TRAFFIC MONITOR CONSOLE</span>
                              </span>
                              <span className="animate-pulse-soft text-green-500">LIVE FEED</span>
                            </div>
                            <div className="flex-1 space-y-1.5 select-all overflow-y-auto max-h-[140px] pr-2">
                              {stuckDiagnosis.simulatedLogs.map((log, idx) => (
                                <div key={idx} className="text-gray-400 hover:text-white transition-all bg-watchguard-lightgray/10 p-1.5 rounded border border-watchguard-border/20 leading-relaxed break-all">
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

            {/* Step Completion Footer */}
            <div className="px-6 py-4 bg-watchguard-lightgray border-t border-watchguard-border flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">
                Step Checklist Status: {completedSteps.includes(activeStepIdx) ? "✓ Complete" : "Pending completion..."}
              </span>
              <button
                onClick={handleStepComplete}
                className="flex items-center space-x-2 bg-watchguard-orange hover:bg-watchguard-orange/95 px-4 py-2.5 rounded-lg text-white font-semibold transition-all border border-watchguard-orange/40"
              >
                <span>{activeStepIdx + 1 === activeLab?.steps.length ? "Complete Lab Exercise" : "Confirm Completion & Proceed"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
