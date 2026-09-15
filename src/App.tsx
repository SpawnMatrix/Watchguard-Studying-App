import type { QuizLaunch } from './engine/useQuizEngine';
import StudyHome from './components/StudyHome';
import { LearningTrackSwitcher, useLearningTrack } from './engine/LearningTrack';
import ReleaseFooter from './components/ReleaseFooter';
import { useAccount } from "./account/AccountGate";
import { writeStudyValue } from "./account/storage";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { tabFromHash } from "./engine/shortcuts";
import { loadSection } from "./engine/lazySection";
import SectionErrorBoundary from "./components/SectionErrorBoundary";
import { Waypoints, House, Bot, Trophy, Layers, BarChart3, ShieldCheck, Terminal, UserRound, Clock, Globe, BookMarked, Sun, Moon, Pencil } from "lucide-react";
// Study Home loads with the app; every other section is fetched the first time it is opened, so the
// first visit does not download the lab simulator, the sandbox and the whole question bank at once.
const GeneralChat = lazy(() => loadSection(() => import("./components/GeneralChat")));
const PracticeQuiz = lazy(() => loadSection(() => import("./components/PracticeQuiz")));
const LabWalkthrough = lazy(() => loadSection(() => import("./components/LabWalkthrough")));
const PerformanceDashboard = lazy(() => loadSection(() => import("./components/PerformanceDashboard")));
const NetworkSimulator = lazy(() => loadSection(() => import("./components/NetworkSimulator")));
const FlashcardStudio = lazy(() => loadSection(() => import("./components/FlashcardStudio")));
const TopologyStudio = lazy(() => loadSection(() => import("./components/TopologyStudio")));
import { motion, AnimatePresence, MotionConfig } from "motion/react";

type Tab = "topology" | "home" | "chat" | "quiz" | "labs" | "flashcards" | "sandbox" | "admin";
const TABS: readonly Tab[] = ["home", "chat", "quiz", "topology", "labs", "flashcards", "sandbox", "admin"];

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
  const [quizLaunch,setQuizLaunch]=useState<QuizLaunch|null>(null);
  const {track} = useLearningTrack();
  // The open section lives in the URL (#labs, #quiz), so a reload keeps your place and Back works.
  const [activeTab, setActiveTab] = useState<Tab>(() => tabFromHash(window.location.hash, TABS) ?? "home");
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigation.current;
    if (!nav) return;
    const revealCurrentSection = () => {
      const current = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current || nav.scrollWidth <= nav.clientWidth) return;
      const left = current.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      if (left < 0 || left + current.offsetWidth > nav.clientWidth) {
        nav.scrollTo({ left: nav.scrollLeft + left - 18, behavior: 'auto' });
      }
    };
    revealCurrentSection();
    const observer = new ResizeObserver(revealCurrentSection);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeTab]);
  useEffect(() => {
    const current = tabFromHash(window.location.hash, TABS);
    if (current !== activeTab && (current !== null || activeTab !== "home")) window.history.pushState(null, "", `#${activeTab}`);
  }, [activeTab]);
  useEffect(() => {
    // Anchors that are not sections, such as the skip link, change the hash without changing section.
    const onPop = () => { const tab = tabFromHash(window.location.hash, TABS); if (tab) setActiveTab(tab); else if (!window.location.hash) setActiveTab("home"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
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
    // Stay on the lab: it shows its own completion summary and the next lab. This used to jump to
    // the admin tab, which a learner without the admin role cannot use.
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
    { id: "topology", label: "Topology Lab", icon: Waypoints },
    { id: "labs", label: "Lab Exercises", icon: Layers },
    { id: "flashcards", label: "Flashcards", icon: BookMarked },
    { id: "sandbox", label: "Network Sandbox", icon: Terminal },
    { id: "admin", label: "Progress & Admin", icon: BarChart3 }
  ];

  return (
    <MotionConfig reducedMotion="user"><div className="app-shell modern-shell min-h-screen bg-watchguard-dark text-gray-100 font-sans">
      
      <a className="skip-link" href="#study-content">Skip to study content</a>
      <header className="app-header">
        <div className="app-header-inner">
          <button className="app-brand" onClick={() => setActiveTab('home')} aria-label="WatchGuard Study Lab home">
            <span className="brand-mark"><ShieldCheck size={24}/></span>
            <span><strong>WatchGuard<span>Study Lab</span></strong><small>LEARN. CONFIGURE. MASTER.</small></span>
          </button>
          <LearningTrackSwitcher />
          <div className="shell-tools">
            <details className="session-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
              <summary aria-label={'Account menu for ' + (account.username || profileName || 'learner')}><span className="account-avatar"><UserRound size={17}/></span><span className="account-summary"><strong>{account.username || profileName || "Your account"}</strong><small><i className={isOnline ? 'is-online' : ''}/>{account.status}</small></span></summary>
              <div className="session-popover">
                <strong>{account.username || profileName || 'Your workspace'}</strong><p>{account.status}</p>
                <button onClick={account.open}><UserRound size={16}/>Manage study account</button>
                <button onClick={() => { setProfileDraft(profileName); setIsProfileEditorOpen(true); }}><Pencil size={16}/>Edit display name</button>
                <div><Clock size={14}/><span title={timeZone}>{localTime}</span></div>
                <div><Globe size={14}/><span title={timeZone}>{isOnline ? locale + ' · ' + platform : 'Browser offline'}</span></div>
              </div>
            </details>
            <button className="theme-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? 'Activate Light Theme' : 'Activate Dark Theme'} aria-label={theme === 'dark' ? 'Activate Light Theme' : 'Activate Dark Theme'}>
              {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Study Arena Layout (Expanded Unified Container) */}
      <main className="study-layout">
        
        {/* Tab Navigation Tray */}
        <nav ref={navigation} aria-label="Study sections" className="study-nav">
          <p className="nav-caption">WORKSPACE</p>
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
                <span>{t.label}</span><span className="nav-active-dot" aria-hidden="true"/>
              </button>
            );
          })}
          <div className="nav-note"><ShieldCheck size={20}/><strong>Practice with purpose.</strong><p>Understand the why behind every configuration.</p></div>
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
              <SectionErrorBoundary>
              <Suspense fallback={<p className="section-loading" role="status">Loading section…</p>}>
              {activeTab === "home" && <StudyHome name={profileName || account.username || 'learner'} history={quizStats.history} completedLabs={completedLabs} onNavigate={setActiveTab}/>}
              {(activeTab === 'labs' || activeTab === 'sandbox') && track !== 'local' && <p className="track-notice" role="status">Shared local Firebox practice · apply networking concepts here. These exercises use locally-managed Fireboxes; cloud management workflows are covered in the Cloud Q&A, quizzes and flashcards.</p>}
              {activeTab === "chat" && <GeneralChat />}
              {activeTab === "quiz" && <PracticeQuiz onScoreUpdated={handleScoreUpdated} launch={quizLaunch} onLaunchConsumed={()=>setQuizLaunch(null)} />}
              {activeTab === "topology" && <TopologyStudio onPractice={launch=>{setQuizLaunch(launch);setActiveTab('quiz');}}/>}
              {activeTab === "labs" && <LabWalkthrough onLabCompleted={handleLabCompleted} completedLabs={completedLabs} />}
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
              </Suspense>
              </SectionErrorBoundary>
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
    </div></MotionConfig>
  );
}
