import { useEffect, useMemo, useState } from "react";
import { Bot, Trophy, Layers, BarChart3, ShieldCheck, Terminal, UserRound, Clock, Globe, BookMarked, Sun, Moon } from "lucide-react";
import GeneralChat from "./components/GeneralChat";
import PracticeQuiz from "./components/PracticeQuiz";
import LabWalkthrough from "./components/LabWalkthrough";
import PerformanceDashboard from "./components/PerformanceDashboard";
import NetworkSimulator from "./components/NetworkSimulator";
import FlashcardStudio from "./components/FlashcardStudio";
import { motion, AnimatePresence } from "motion/react";

type Tab = "chat" | "quiz" | "labs" | "flashcards" | "sandbox" | "admin";

interface QuizHistoryItem {
  questionId: number;
  selectedAnswers: string[];
  isCorrect: boolean;
  explanation: string;
  topic: string;
}

interface QuizStats {
  score: string;
  topicWeaknesses: string[];
  history: QuizHistoryItem[];
}

interface SessionIdentity {
  authenticated: boolean;
  displayName: string;
  email?: string;
  source: "pangolin" | "direct";
}

const PROGRESS_STORAGE_KEY = "watchguard-study-progress-v1";
const DEFAULT_QUIZ_STATS: QuizStats = {
  score: "0%",
  topicWeaknesses: [],
  history: []
};

function loadSavedProgress(): { quizStats: QuizStats; completedLabs: string[] } {
  try {
    const saved = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!saved) return { quizStats: DEFAULT_QUIZ_STATS, completedLabs: [] };

    const parsed = JSON.parse(saved);
    if (!parsed?.quizStats || !Array.isArray(parsed.completedLabs)) {
      return { quizStats: DEFAULT_QUIZ_STATS, completedLabs: [] };
    }

    return parsed;
  } catch {
    return { quizStats: DEFAULT_QUIZ_STATS, completedLabs: [] };
  }
}

function getPlatformLabel() {
  const userAgent = navigator.userAgent;
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Browser";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("watchguard-portal-theme") as "dark" | "light") || "dark";
  });
  const savedProgress = useMemo(loadSavedProgress, []);
  const [quizStats, setQuizStats] = useState<QuizStats>(savedProgress.quizStats);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("watchguard-portal-theme", theme);
  }, [theme]);
  const [completedLabs, setCompletedLabs] = useState<string[]>(savedProgress.completedLabs);
  const [sessionIdentity, setSessionIdentity] = useState<SessionIdentity>({
    authenticated: false,
    displayName: "Local browser",
    source: "direct"
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(() => new Date());

  const locale = navigator.language || "en-US";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  const platform = getPlatformLabel();
  const localTime = useMemo(
    () => new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(now),
    [locale, now]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/session", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error("Session lookup failed");
        return response.json();
      })
      .then((session: SessionIdentity) => setSessionIdentity(session))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSessionIdentity({ authenticated: false, displayName: "Local browser", source: "direct" });
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30_000);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearInterval(clock);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ quizStats, completedLabs }));
  }, [quizStats, completedLabs]);

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
    { id: "chat", label: "Study Q&A Desk", icon: Bot },
    { id: "quiz", label: "Practice Quiz", icon: Trophy },
    { id: "labs", label: "Lab Exercises", icon: Layers },
    { id: "flashcards", label: "Flashcards Studio", icon: BookMarked },
    { id: "sandbox", label: "FSM Sandbox", icon: Terminal },
    { id: "admin", label: "Admin Panel", icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-watchguard-dark text-gray-100 flex flex-col font-sans">
      
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
              <h1 className="font-display font-bold text-white tracking-tight text-xl sm:text-2xl drop-shadow-md">
                WatchGuard Certified Network Security Training Portal
              </h1>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                Enterprise NSE locally-managed firebox curriculum
              </p>
            </div>
          </div>

          {/* Connected Session Telemetry Details & Mode Toggle */}
          <div className="flex items-center gap-3.5 flex-wrap md:flex-nowrap">
            <div className="flex items-center space-x-5 text-xs text-gray-400 bg-watchguard-dark/60 border border-watchguard-border/60 px-4 py-2 rounded-xl flex-wrap gap-2.5">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-watchguard-orange" />
                <span className="font-mono" title={timeZone}>{localTime}</span>
              </div>
              <div className="hidden sm:flex items-center space-x-1.5 border-l border-watchguard-border pl-5">
                <UserRound className="w-3.5 h-3.5 text-watchguard-orange" />
                <span
                  className="font-mono"
                  title={sessionIdentity.authenticated ? "Identity provided by Pangolin SSO" : "Direct browser session"}
                >
                  {sessionIdentity.email || sessionIdentity.displayName}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 border-l border-watchguard-border pl-5">
                <Globe className={`w-3.5 h-3.5 ${isOnline ? "text-emerald-400" : "text-red-400"}`} />
                <span className="font-mono" title={`${timeZone} • ${sessionIdentity.source} session`}>
                  {isOnline ? `${locale} • ${platform}` : "Browser offline"}
                </span>
              </div>
            </div>

            {/* SvelteKit-Style Premium Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-watchguard-border bg-watchguard-dark/60 hover:border-watchguard-orange hover:bg-watchguard-lightgray/40 text-gray-400 hover:text-white transition-all duration-300 shadow-md hover:shadow-lg shadow-black/25 relative overflow-hidden group active:scale-95 cursor-pointer"
              title={theme === "dark" ? "Activate Light Theme" : "Activate Dark Theme"}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-watchguard-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-watchguard-orange group-hover:rotate-45 transition-transform duration-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400 group-hover:-rotate-12 transition-transform duration-500" />
              )}
            </button>
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
              {activeTab === "flashcards" && <FlashcardStudio />}
              {activeTab === "sandbox" && <NetworkSimulator />}
              {activeTab === "admin" && (
                <PerformanceDashboard 
                  score={quizStats.score} 
                  topicWeaknesses={quizStats.topicWeaknesses} 
                  history={quizStats.history}
                  completedLabs={completedLabs}
                  sessionEmail={sessionIdentity.email}
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
