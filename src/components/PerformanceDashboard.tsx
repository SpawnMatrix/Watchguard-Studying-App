import { errorHandler } from "../utils/errorHandler";
import React, { useState, useEffect } from "react";
import { Award, ShieldAlert, BookOpen, FileText, CheckCircle2, ChevronRight, AlertTriangle, Printer, Key, Lock, Unlock, Settings, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleError } from "../utils/errorHandler";

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

  const [userCustomKey, setUserCustomKey] = useState(() => localStorage.getItem("watchguard_custom_gemini_api_key") || "");
  const [showKey, setShowKey] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [globalAIEnabled, setGlobalAIEnabledState] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminIsSuccess, setAdminIsSuccess] = useState(false);

  const isAuthorizedAdmin = isAdminLoggedIn;

  // Fetch current global features on mount
  const fetchFeatures = () => {
    const customKey = localStorage.getItem("watchguard_custom_gemini_api_key") || "";
    fetch("/api/features", {
      headers: { "X-Gemini-API-Key": customKey }
    })
      .then(res => res.json())
      .then(data => {
        if (data.globalAIEnabled !== undefined) {
          setGlobalAIEnabledState(data.globalAIEnabled);
        }
      })
      .catch(err => handleError("Failed to query initial feature status", err));
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const handleSaveCustomKey = (val: string) => {
    setUserCustomKey(val);
    if (val.trim()) {
      localStorage.setItem("watchguard_custom_gemini_api_key", val.trim());
    } else {
      localStorage.removeItem("watchguard_custom_gemini_api_key");
    }
  };

  const handleClearCustomKey = () => {
    setUserCustomKey("");
    localStorage.removeItem("watchguard_custom_gemini_api_key");
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage("");
    setAdminIsSuccess(false);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      if (response.ok) {
        setIsAdminLoggedIn(true);
        setAdminIsSuccess(true);
        setAdminMessage("Admin password validated. Control gates opened.");
        fetchFeatures();
      } else {
        const err = await response.json();
        setAdminMessage(err.message || "Invalid Admin Credentials.");
      }
    } catch (err: any) {
      setAdminMessage("Communication with gateway failed.");
    }
  };

  const handleToggleGlobalAI = async () => {
    setAdminMessage("");
    setAdminIsSuccess(false);
    try {
      const targetState = !globalAIEnabled;
      const response = await fetch("/api/admin/toggle-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword, globalAIEnabled: targetState })
      });
      if (response.ok) {
        const data = await response.json();
        setGlobalAIEnabledState(data.globalAIEnabled);
        setAdminIsSuccess(true);
        setAdminMessage(`Global AI feature successfully toggled ${data.globalAIEnabled ? "ON" : "OFF"}.`);
      } else {
        const err = await response.json();
        setAdminMessage(err.message || "Failed to toggle global AI state.");
      }
    } catch (err: any) {
      setAdminMessage("Communication failure while toggling state.");
    }
  };

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
      handleError("Report error", error);
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
