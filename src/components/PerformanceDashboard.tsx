import { useState } from "react";
import { Award, ShieldAlert, BookOpen, FileText, CheckCircle2, ChevronRight, AlertTriangle, Printer, Share2, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
}

export default function PerformanceDashboard({ score, topicWeaknesses, history, completedLabs }: PerformanceDashboardProps) {
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
      const response = await fetch("/api/admin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Exam Readiness Score */}
        <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Audited Exam Readiness</span>
            <div className="text-3xl font-display font-bold text-watchguard-orange">{score}</div>
          </div>
          <div className="p-3 bg-watchguard-orange/10 rounded-full">
            <Award className="w-6 h-6 text-watchguard-orange" />
          </div>
        </div>

        {/* Labs Completed */}
        <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Completed Core Labs</span>
            <div className="text-3xl font-display font-bold text-white">{completedLabs.length} / 5</div>
          </div>
          <div className="p-3 bg-green-500/10 rounded-full">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </div>
        </div>

        {/* Total Exam Questions Answered */}
        <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Simulator Attempts</span>
            <div className="text-3xl font-display font-bold text-white">
              {history.filter(h => h.isCorrect).length} / {history.length} Correct
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-full">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certification Weakness Tracker / Study Plan */}
        <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-watchguard-border pb-3">
            <ShieldAlert className="w-4 h-4 text-watchguard-orange" />
            <h3 className="font-display font-semibold text-white">Critical Weakness Tracker</h3>
          </div>

          {topicWeaknesses.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              Technician study records show zero active concept vulnerabilities. Complete practicing quiz questions to trigger tracking checks.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Our active exam tracking indicates weaknesses in the following certified namespaces. Click recommended labs to resolve the vulnerabilities:
              </p>
              <div className="space-y-2">
                {topicWeaknesses.map((weakness, idx) => (
                  <div key={idx} className="p-3 bg-watchguard-dark border border-watchguard-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      <span className="text-xs font-medium text-gray-200">{weakness} Vulnerability</span>
                    </div>
                    <span className="text-[9px] font-mono font-medium text-watchguard-orange uppercase tracking-wider bg-watchguard-orange/10 px-2 py-0.5 rounded border border-watchguard-orange/20">
                      Remediation Mandatory
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Audit Report Builder */}
        <div className="bg-watchguard-gray border border-watchguard-border rounded-xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 border-b border-watchguard-border pb-3">
              <FileText className="w-4 h-4 text-watchguard-orange" />
              <h3 className="font-display font-semibold text-white">Generate Executive Performance Audit</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Compile your training progress logs into a structured audit report using the Gemini Deep reasoning engine. This report maps conceptual vulnerabilities back to WatchGuard Lab exercises to establish a customized engineering remediation study plan.
            </p>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={history.length === 0 || isLoading}
            className="w-full mt-4 bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:bg-watchguard-dark disabled:text-gray-500 disabled:border-watchguard-border text-white text-xs font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 border border-watchguard-orange/40 transition-all cursor-pointer"
          >
            <span>{isLoading ? "Running Deep Audit Analysis..." : "Compile & Run Audit Analysis"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Structured report visualization card */}
      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-watchguard-gray border-2 border-watchguard-border rounded-xl p-6 shadow-2xl relative overflow-hidden"
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
                <button 
                  onClick={() => window.print()}
                  className="p-2 bg-watchguard-dark hover:bg-watchguard-lightgray rounded text-gray-400 hover:text-white transition-all border border-watchguard-border"
                  title="Print Audit"
                >
                  <Printer className="w-4 h-4" />
                </button>
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

            {report.isDemo && (
              <div className="mt-6 pt-3 border-t border-watchguard-border flex items-center space-x-2 text-[10px] font-mono text-gray-500">
                <AlertTriangle className="w-3.5 h-3.5 text-watchguard-orange" />
                <span>Simulated Audit Analysis Powered by Local Ruleset daemon</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
