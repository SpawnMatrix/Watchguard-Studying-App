import React, { useState } from "react";
import { OverviewStats, WeaknessTracker, AuditReportBuilder, AdminConsole, ReportVisualization } from "./dashboard";

interface QuizHistoryItem {
  questionId: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

interface PerformanceDashboardProps {
  score: string;
  topicWeaknesses: string[];
  history: QuizHistoryItem[];
  completedLabs: string[];
  displayName: string;
}

export default function PerformanceDashboard({ 
  score, 
  topicWeaknesses, 
  history, 
  completedLabs,
  displayName
}: PerformanceDashboardProps) {
  const [report, setReport] = useState<{
    readinessScore: string;
    strengths: string[];
    criticalVulnerabilities: string[];
    recommendedLabs: string[];
    summary: string;
    isDemo?: boolean;
    errorMessage?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (customKey) {
        headers["X-Gemini-API-Key"] = customKey;
      }

      const response = await fetch("/api/admin/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionHistory: {
            quizScore: score,
            totalQuizAttempts: history.length,
            correctQuizAnswers: history.filter(h => h.isCorrect).length,
            topicWeaknesses: topicWeaknesses,
            completedLabs: completedLabs
          }
        })
      });

      if (!response.ok) {
        throw new Error("Unable to analyze certification performance.");
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Report error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      <OverviewStats score={score} completedLabs={completedLabs} history={history} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeaknessTracker topicWeaknesses={topicWeaknesses} />

        <AuditReportBuilder
          historyLength={history.length}
          isLoading={isLoading}
          onGenerateReport={handleGenerateReport}
        />
      </div>

      <AdminConsole displayName={displayName} />

      <ReportVisualization report={report} />
    </div>
  );
}
