import AdminConsole from './dashboard/AdminConsole';
import { buildStudyReport } from '../engine/progress';
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import OverviewStats from "./dashboard/OverviewStats";
import WeaknessTracker from "./dashboard/WeaknessTracker";
import AuditReportBuilder from "./dashboard/AuditReportBuilder";
import ReportVisualization from "./dashboard/ReportVisualization";

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

  const [panel,setPanel]=useState<'progress'|'admin'>('progress');

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
            history,
            quizScore: score,
            totalQuizAttempts: history.length,
            correctQuizAnswers: history.filter(h => h.isCorrect).length,
            topicWeaknesses: topicWeaknesses,
            completedLabs: completedLabs
          }
        })
      });

      if (response.status===401 || response.status===403) {
        setReport(buildStudyReport({history,completedLabs}));
        return;
      }
      if (!response.ok) throw new Error("Unable to analyze certification performance.");

      const data = await response.json();
      setReport({...data,isDemo:data.isDemoMode||data.isDemo});
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "An unknown error occurred while generating the report.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      <div className="console-tabs" role="group" aria-label="Progress and administration views"><button className={panel==='progress'?'is-active':''} aria-pressed={panel==='progress'} onClick={()=>setPanel('progress')}>Study progress</button><button className={panel==='admin'?'is-active':''} aria-pressed={panel==='admin'} onClick={()=>setPanel('admin')}>Accounts & tutor settings</button></div>
      <div hidden={panel!=='progress'}>
      <OverviewStats score={score} completedLabs={completedLabs} history={history} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeaknessTracker topicWeaknesses={topicWeaknesses} />

        <AuditReportBuilder
          historyLength={history.length}
          isLoading={isLoading}
          onGenerateReport={handleGenerateReport}
        />
      </div>

      <ReportVisualization report={report}/>
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
      </AnimatePresence>
      </div>
      <div hidden={panel!=='admin'}><AdminConsole displayName={displayName}/></div>
    </div>
  );
}
