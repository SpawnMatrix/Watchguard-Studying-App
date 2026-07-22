import { useState } from "react";
import { watchguardLabs, Lab } from "../data/labs";
import LabCatalog from "./LabWalkthrough/LabCatalog";
import ActiveLabWalkthrough from "./LabWalkthrough/ActiveLabWalkthrough";

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

  const handleClearSelectedLab = () => {
    setSelectedLabId(null);
  };

  const handleToggleStuckMode = () => {
    setIsStuckMode(!isStuckMode);
  };

  const handleTechnicianIssueChange = (issue: string) => {
    setTechnicianIssue(issue);
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
      console.error("Diagnostic error:", error);
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      <LabCatalog
        labs={labs}
        selectedLabId={selectedLabId}
        onSelectLab={handleSelectLab}
      />

      <ActiveLabWalkthrough
        activeLab={activeLab}
        activeStepIdx={activeStepIdx}
        completedSteps={completedSteps}
        isStuckMode={isStuckMode}
        technicianIssue={technicianIssue}
        isDiagnosing={isDiagnosing}
        stuckDiagnosis={stuckDiagnosis}
        onClearSelectedLab={handleClearSelectedLab}
        onToggleStuckMode={handleToggleStuckMode}
        onTechnicianIssueChange={handleTechnicianIssueChange}
        onDiagnose={handleDiagnose}
        onStepComplete={handleStepComplete}
      />
    </div>
  );
}
