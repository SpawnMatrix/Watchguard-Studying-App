import StudyHome from './components/StudyHome';
import { LearningTrackSwitcher, useLearningTrack } from './engine/LearningTrack';
import ReleaseFooter from './components/ReleaseFooter';
import { useAccount } from "./account/AccountGate";
import { writeStudyValue } from "./account/storage";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { House, Bot, Trophy, Layers, BarChart3, ShieldCheck, Terminal, UserRound, Clock, Globe, BookMarked, Sun, Moon, Pencil } from "lucide-react";
import GeneralChat from "./components/GeneralChat";
import PracticeQuiz from "./components/PracticeQuiz";
import LabWalkthrough from "./components/LabWalkthrough";
import PerformanceDashboard from "./components/PerformanceDashboard";
import NetworkSimulator from "./components/NetworkSimulator";
import FlashcardStudio from "./components/FlashcardStudio";
import { motion, AnimatePresence } from "motion/react";

type Tab = "home" | "chat" | "quiz" | "labs" | "flashcards" | "sandbox" | "admin";

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
  source: "pangolin" | "direct";
}

const PROGRESS_STORAGE_KEY = "watchguard-study-progress-v1";
const PROFILE_STORAGE_KEY = "watchguard-study-profile-name-v1";
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

function loadProfileName() {
  return (localStorage.getItem(PROFILE_STORAGE_KEY) || "").replace(/\s+/g, " ").trim().slice(0, 32);
}

export default function App() {
  const account = useAccount();
  const {track} = useLearningTrack();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return localStorage.getItem("watchguard-portal-theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
  });
  const savedProgress = useMemo(loadSavedProgress, []);
  const initialProfileName = useMemo(loadProfileName, []);
  const [quizStats, setQuizStats] = useState<QuizStats>(savedProgress.quizStats);
  const [profileName, setProfileName] = useState(initialProfileName);
  const [profileDraft, setProfileDraft] = useState(initialProfileName);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("watchguard-portal-theme", theme);
  }, [theme]);
  const [completedLabs, setCompletedLabs] = useState<string[]>(savedProgress.completedLabs);
  const [sessionIdentity, setSessionIdentity] = useState<SessionIdentity>({
    authenticated: false,
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
          setSessionIdentity({ authenticated: false, source: "direct" });
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
    writeStudyValue(PROGRESS_STORAGE_KEY, JSON.stringify({ quizStats, completedLabs }));
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

  const handleProfileSave = (event: FormEvent) => {
    event.preventDefault();
    const cleanName = profileDraft.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
    if (!cleanName) return;

    writeStudyValue(PROFILE_STORAGE_KEY, cleanName);
    setProfileName(cleanName);
    setProfileDraft(cleanName);
    setIsProfileEditorOpen(false);
  };

  const handleProfileReset = () => {
    writeStudyValue(PROFILE_STORAGE_KEY, null);
    setProfileName("");
    setProfileDraft("");
  };

  const tabsConfig = [
    { id: "home", label: "Study Home", icon: House },
    { id: "chat", label: "Study Q&A Desk", icon: Bot },
    { id: "quiz", label: "Practice Quiz", icon: Trophy },
    { id: "labs", label: "Lab Exercises", icon: Layers },
    { id: "flashcards", label: "Flashcards", icon: BookMarked },
    { id: "sandbox", label: "Network Sandbox", icon: Terminal },
    { id: "admin", label: "Progress & Admin", icon: BarChart3 }
  ];

  return (
    <div className="app-shell min-h-screen bg-watchguard-dark text-gray-100 font-sans">
      
      {/* Top Professional Navigation Console Bar */}
      <a className="skip-link" href="#study-content">Skip to study content</a>
      <header className="app-header bg-watchguard-gray border-b border-watchguard-border z-20">
        <div className="app-header-inner">
          
          {/* Brand and Certification Metadata */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-watchguard-orange rounded-xl flex items-center justify-center border border-watchguard-orange/40 shadow-lg shadow-watchguard-orange/10 relative overflow-hidden">
              <ShieldCheck className="w-6 h-6 text-white" />
              {/* Overlay sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent"></div>
            </div>
            <div>
              <h1 className="font-display font-bold text-white tracking-tight text-lg sm:text-xl">
                WatchGuard Study Lab
              </h1>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                Local Firebox · Network+ · Cloud
              </p>
            </div>
          </div>

          <LearningTrackSwitcher />

          {/* Connected Session Telemetry Details & Mode Toggle */}
          <div className="session-tools flex items-center gap-3.5 flex-wrap md:flex-nowrap">
            <div className="session-telemetry flex items-center space-x-5 text-xs text-gray-400 bg-watchguard-dark/60 border border-watchguard-border/60 px-4 py-2 rounded-xl flex-wrap gap-2.5">
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-watchguard-orange" />
                <span className="font-mono" title={timeZone}>{localTime}</span>
              </div>
              <button
                type="button"
                onClick={account.open}
                className="flex items-center space-x-1.5 border-l border-watchguard-border pl-5 hover:text-white transition-colors cursor-pointer"
                title="Your study account"
              >
                <UserRound className="w-3.5 h-3.5 text-watchguard-orange" />
                <span className="font-mono">{account.username || profileName || "Your account"}</span>
                <span className="sync-label">{account.status}</span>
              </button>
              <div className="flex items-center space-x-1.5 border-l border-watchguard-border pl-5">
                <Globe className={`w-3.5 h-3.5 ${isOnline ? "text-emerald-400" : "text-red-400"}`} />
                <span className="font-mono" title={timeZone}>
                  {isOnline ? `${locale} • ${platform}` : "Browser offline"}
                </span>
              </div>
            </div>

            <button aria-label="Edit display name" title="Edit display name" className="text-gray-400" onClick={() => { setProfileDraft(profileName); setIsProfileEditorOpen(true); }}><Pencil size={16}/></button>
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
      <main className="study-layout">
        
        {/* Tab Navigation Tray */}
        <nav aria-label="Study sections" className="study-nav">
          <p className="nav-caption">YOUR WORKSPACE</p>
          {tabsConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as Tab)}
                aria-current={isActive ? "page" : undefined}
                aria-label={t.label}
                className={`study-nav-item ${isActive ? "is-active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Learning Component Panel */}
        <div id="study-content" tabIndex={-1} className="study-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === "home" && <StudyHome name={profileName || account.username || 'learner'} history={quizStats.history} completedLabs={completedLabs} onNavigate={setActiveTab}/>}
              {(activeTab === 'labs' || activeTab === 'sandbox') && track !== 'local' && <p className="track-notice" role="status">Shared local Firebox practice · apply networking concepts here. These exercises use locally-managed Fireboxes; cloud management workflows are covered in the Cloud Q&A, quizzes and flashcards.</p>}
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
                  displayName={profileName || "Local learner"}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Security Footer */}
      <ReleaseFooter />

      <AnimatePresence>
        {isProfileEditorOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-dialog-title"
              className="w-full max-w-md rounded-2xl border border-watchguard-border bg-watchguard-gray p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
            >
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-watchguard-orange/10 text-watchguard-orange border border-watchguard-orange/30">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="profile-dialog-title" className="font-display text-lg font-bold text-white">
                    {profileName ? "Edit your display name" : "Choose your study name"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    Choose how your name appears in your study reports. Your sign-in username stays the same.
                  </p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Display name
                  </label>
                  <input
                    id="profile-name"
                    autoFocus
                    required
                    maxLength={32}
                    autoComplete="nickname"
                    value={profileDraft}
                    onChange={(event) => setProfileDraft(event.target.value)}
                    placeholder="For example: Alex or Sam"
                    className="w-full rounded-lg border border-watchguard-border bg-watchguard-dark px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-watchguard-orange"
                  />
                  <p className="mt-1.5 text-[10px] font-mono text-gray-500">32 characters maximum</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  {profileName ? (
                    <button
                      type="button"
                      onClick={handleProfileReset}
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Clear display name
                    </button>
                  ) : <span />}
                  <div className="flex gap-2">
                    {profileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDraft(profileName);
                          setIsProfileEditorOpen(false);
                        }}
                        className="rounded-lg border border-watchguard-border px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-watchguard-lightgray/40 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!profileDraft.trim()}
                      className="rounded-lg border border-watchguard-orange/40 bg-watchguard-orange px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-watchguard-orange/90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      Save profile
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
