import { useState } from "react";
import { Bot, Trophy, Layers, BarChart3, ShieldCheck, Terminal, Settings, Mail, Clock, Globe } from "lucide-react";
import GeneralChat from "./components/GeneralChat";
import PracticeQuiz from "./components/PracticeQuiz";
import LabWalkthrough from "./components/LabWalkthrough";
import PerformanceDashboard from "./components/PerformanceDashboard";
import NetworkSimulator from "./components/NetworkSimulator";
import { motion, AnimatePresence } from "motion/react";

type Tab = "chat" | "quiz" | "labs" | "sandbox" | "admin";

interface QuizHistoryItem {
  questionId: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  
  // Unified certification study statistics
  const [quizStats, setQuizStats] = useState<{
    score: string;
    topicWeaknesses: string[];
    history: QuizHistoryItem[];
  }>({
    score: "0%",
    topicWeaknesses: [],
    history: []
  });

  const [completedLabs, setCompletedLabs] = useState<string[]>([]);

  const handleScoreUpdated = (record: { score: string; topicWeaknesses: string[]; history: QuizHistoryItem[] }) => {
    setQuizStats(record);
  };

  const handleLabCompleted = (labId: number, name: string) => {
    if (!completedLabs.includes(name)) {
      setCompletedLabs(prev => [...prev, name]);
    }
    // Switch to admin view automatically to see performance report
    setActiveTab("admin");
  };

  const tabsConfig = [
    { id: "chat", label: "General Study Q&A", icon: Bot },
    { id: "quiz", label: "Adaptive Quiz Engine", icon: Trophy },
    { id: "labs", label: "Hands-on Lab Guides", icon: Layers },
    { id: "sandbox", label: "Interactive FSM Sandbox", icon: Terminal },
    { id: "admin", label: "Manager & Performance reports", icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-watchguard-dark text-gray-100 flex flex-col font-sans select-none">
      
      {/* Top Professional Navigation Console Bar */}
      <header className="bg-watchguard-gray border-b border-watchguard-border shadow-xl z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand and Certification Metadata */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-watchguard-orange rounded-xl flex items-center justify-center border border-watchguard-orange/40 shadow-lg shadow-watchguard-orange/10 relative overflow-hidden">
              <ShieldCheck className="w-6 h-6 text-white" />
              {/* Overlay sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
            </div>
            <div>
              <h1 className="font-display font-bold text-white tracking-tight text-lg sm:text-xl">
                WatchGuard Certified Network Security Training Portal
              </h1>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                Enterprise NSE locally-managed firebox curriculum
              </p>
            </div>
          </div>

          {/* Connected Session Telemetry Details */}
          <div className="flex items-center space-x-5 text-xs text-gray-400 bg-watchguard-dark/60 border border-watchguard-border/60 px-4 py-2 rounded-xl flex-wrap gap-2.5">
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-watchguard-orange" />
              <span className="font-mono">PDT (UTC-7) Zone</span>
            </div>
            <div className="hidden sm:flex items-center space-x-1.5 border-l border-watchguard-border pl-5">
              <Mail className="w-3.5 h-3.5 text-watchguard-orange" />
              <span className="font-mono">Juliendumitrescu@gmail.com</span>
            </div>
            <div className="flex items-center space-x-1.5 border-l border-watchguard-border pl-5">
              <Globe className="w-3.5 h-3.5 text-watchguard-orange" />
              <span className="font-mono">Local Daemon Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Study Arena Layout (Expanded Unified Container) */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col space-y-6 overflow-hidden">
        
        {/* Tab Navigation Tray */}
        <nav className="flex items-center space-x-1 bg-watchguard-gray/80 p-1 rounded-xl border border-watchguard-border w-full">
          {tabsConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as Tab)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all select-none cursor-pointer ${
                  isActive 
                    ? "bg-watchguard-orange text-white border border-watchguard-orange/40 shadow-lg shadow-watchguard-orange/10" 
                    : "text-gray-400 hover:text-white hover:bg-watchguard-lightgray/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Learning Component Panel */}
        <div className="flex-1 w-full min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === "chat" && <GeneralChat />}
              {activeTab === "quiz" && <PracticeQuiz onScoreUpdated={handleScoreUpdated} />}
              {activeTab === "labs" && <LabWalkthrough onLabCompleted={handleLabCompleted} />}
              {activeTab === "sandbox" && <NetworkSimulator />}
              {activeTab === "admin" && (
                <PerformanceDashboard 
                  score={quizStats.score} 
                  topicWeaknesses={quizStats.topicWeaknesses} 
                  history={quizStats.history}
                  completedLabs={completedLabs}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Security Footer */}
      <footer className="bg-watchguard-gray/40 border-t border-watchguard-border py-4.5 px-6 mt-auto text-center text-xs text-gray-500 font-mono">
        <p>© 2026 WatchGuard training portal • Authorized certified technical study engine v12.9.2+</p>
      </footer>
    </div>
  );
}
