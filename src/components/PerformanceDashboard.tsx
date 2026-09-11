import React, { useState, useEffect } from "react";
import { Award, ShieldAlert, BookOpen, FileText, CheckCircle2, ChevronRight, AlertTriangle, Printer, Key, Lock, Unlock, Settings, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OverviewStats from "./dashboard/OverviewStats";
import WeaknessTracker from "./dashboard/WeaknessTracker";
import AuditReportBuilder from "./dashboard/AuditReportBuilder";
import ReportVisualization from "./dashboard/ReportVisualization";
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
  } | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
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
    setReportError(null);
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
      setReportError(error instanceof Error ? error.message : "An unknown error occurred while generating the report.");
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

      {/* Security Gateway AI Console (Admin and User Override panel) */}
      <div className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-6 shadow-2xl space-y-6 transition-transform hover:-translate-y-1 hover:shadow-watchguard-orange/10">
        <div className="flex items-center justify-between border-b border-watchguard-border pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-watchguard-orange" />
            <h3 className="font-display font-semibold text-white">Administration Control Console</h3>
          </div>
          <div className="flex items-center space-x-2.5 text-[10px] font-mono">
            <span className="text-gray-400">Current User:</span>
            <span className="text-watchguard-orange bg-watchguard-orange/10 px-2 py-0.5 rounded border border-watchguard-orange/20 font-bold">
              {displayName}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400">Tutor Features:</span>
            {globalAIEnabled ? (
              <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-wide font-bold">
                Online
              </span>
            ) : (
              <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wide font-bold">
                Offline (Q&A mode)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Student Custom Key Override */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-gray-200 font-mono flex items-center space-x-1.5 mb-1">
                <Key className="w-3.5 h-3.5 text-watchguard-orange" />
                <span>Custom Gemini API Key Override</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                Want to run your own unlimited AI endpoints? Provide your own Google Gemini API key to override administrator resource control gates. This key is saved locally in your browser.
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={userCustomKey}
                  onChange={(e) => handleSaveCustomKey(e.target.value)}
                  placeholder="AI Studio API Key (AI_...) or Gemini Key"
                  className="w-full bg-watchguard-dark border border-watchguard-border text-xs text-white rounded-lg pl-3 pr-10 py-2.5 outline-none focus:border-watchguard-orange/50 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {userCustomKey && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-green-400 font-mono">✓ API key active locally</span>
                  <button
                    onClick={handleClearCustomKey}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-all font-mono underline bg-transparent border-0 cursor-pointer"
                  >
                    Clear Override Key
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Password-protected admin controls */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-watchguard-border pt-4 md:pt-0 md:pl-6">
            <div>
              <h4 className="text-xs font-bold text-gray-200 font-mono flex items-center space-x-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-watchguard-orange" />
                <span>Administrator Bypass & Security Rules</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                {isAuthorizedAdmin ? (
                  <span className="text-green-400 font-medium">✓ Administrator password validated for this page session.</span>
                ) : (
                  <span>Enter the administrator password to change shared server settings. Local study profiles do not grant admin access.</span>
                )}
              </p>
            </div>

            {/* If NOT authorized, show password login */}
            {!isAuthorizedAdmin && (
              <form onSubmit={handleAdminLogin} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Admin Bypass Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="flex-1 bg-watchguard-dark border border-watchguard-border text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-watchguard-orange/50 transition-all font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-watchguard-orange hover:bg-watchguard-orange/95 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all border border-watchguard-orange/40 cursor-pointer"
                  >
                    Authenticate
                  </button>
                </div>
              </form>
            )}

            {/* If authorized by password, show shared control sliders */}
            {isAuthorizedAdmin && (
              <div className="space-y-4">
                
                {/* AI Toggle State */}
                <div className="flex items-center justify-between bg-watchguard-dark border border-watchguard-border rounded-lg p-2.5">
                  <div className="space-y-0.5">
                    <span className="text-xs text-white font-mono block">Global AI Features</span>
                    <span className="text-[10px] text-gray-400 font-sans block">Default: Offline (Q&A only)</span>
                  </div>
                  <button
                    onClick={handleToggleGlobalAI}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all border cursor-pointer ${
                      globalAIEnabled
                        ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                    }`}
                  >
                    {globalAIEnabled ? "Toggle OFF" : "Toggle ON"}
                  </button>
                </div>


                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-green-400 font-mono">✓ Authorized Admin Access Active</span>
                  {isAdminLoggedIn && (
                    <button
                      onClick={() => {
                        setIsAdminLoggedIn(false);
                        setAdminPassword("");
                        setAdminMessage("");
                      }}
                      className="text-[10px] text-gray-400 hover:text-white transition-all font-mono underline bg-transparent border-0 cursor-pointer"
                    >
                      Lock Manual Session
                    </button>
                  )}
                </div>

              </div>
            )}

            {adminMessage && (
              <p className={`text-[10px] font-mono mt-2 ${adminIsSuccess ? "text-green-400" : "text-red-400"}`}>
                {adminMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Structured report visualization card */}
      <AnimatePresence>
        {reportError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-watchguard-gray border-2 border-red-500/50 rounded-2xl p-8 shadow-3xl relative overflow-hidden transition-all"
          >
            <div className="flex items-center space-x-2 text-red-400 font-mono text-sm">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Error generating report: {reportError}</span>
            </div>
          </motion.div>
        )}
        {report && !reportError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-watchguard-gray border-2 border-watchguard-orange/50 rounded-2xl p-8 shadow-3xl relative overflow-hidden transition-all hover:border-watchguard-orange"
          >
            {/* Glowing background ring */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-watchguard-orange/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-watchguard-border pb-4 mb-5 flex-wrap gap-3">
              <div>
                <h3 className="font-display font-bold text-white flex items-center space-x-2 text-sm sm:text-base">
                  <span className="w-2.5 h-2.5 bg-watchguard-orange rounded-full animate-ping"></span>
                  <span>WATCHGUARD NSE READINESS AUDIT REPORT</span>
                </h3>
                <p className="text-[10px] font-mono text-gray-500 mt-0.5">Syllabus compliance audit • Fireware OS v12.9.2+</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wide">Readiness Score</span>
                  <div className="text-xl font-display font-bold text-watchguard-orange">{report.readinessScore}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths & Vulnerabilities */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-green-400 font-mono tracking-wide uppercase mb-2">Verified Conceptual Strengths</h4>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {report.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span className="leading-relaxed font-sans">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-400 font-mono tracking-wide uppercase mb-2">Namespace Vulnerabilities</h4>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {report.criticalVulnerabilities.map((v, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-red-500 mt-0.5">■</span>
                        <span className="leading-relaxed font-sans">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommended Labs & Summary */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-watchguard-orange font-mono tracking-wide uppercase mb-2">Recommended Study Remediation Labs</h4>
                  <div className="flex flex-wrap gap-2">
                    {report.recommendedLabs.map((lab, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-mono font-medium bg-watchguard-orange/10 text-watchguard-orange px-2.5 py-1.5 rounded-lg border border-watchguard-orange/30"
                      >
                        {lab}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 font-mono tracking-wide uppercase mb-2">Auditor Summary & Outlook</h4>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {report.summary}
                  </p>
                </div>
              </div>
            </div>

      <ReportVisualization report={report} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
