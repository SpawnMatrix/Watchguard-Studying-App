import { ArrowRight, ArrowUpRight, BookOpen, Target, Activity, Network, Layers, Flame, ShieldCheck, GraduationCap } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { QuizHistoryItem } from './QuizAnalyticsPanel';
import { homeMetrics } from '../engine/homeMetrics';
import { buildStudyReport } from '../engine/progress';
import { useLearningTrack, learningTrackLabels } from '../engine/LearningTrack';
import { readJSON } from '../account/storage';
import OverviewStats from './dashboard/OverviewStats';

type Destination = 'quiz' | 'labs' | 'sandbox' | 'flashcards' | 'admin' | 'topology';
interface SavedQuiz {
  current?: { topic: string }; complete?: boolean; mode?: string; index?: number; queue?: unknown[];
}
const shortcuts: { tab: Destination; title: string; detail: string; icon: typeof Target; tone: string }[] = [
  { tab: 'quiz', title: 'Practice quiz', detail: 'Turn knowledge into instinct', icon: Target, tone: 'orange' },
  { tab: 'topology', title: 'Topology lab', detail: 'See how the network connects', icon: Network, tone: 'blue' },
  { tab: 'labs', title: 'Hands-on labs', detail: 'Learn it by configuring it', icon: Layers, tone: 'green' },
  { tab: 'flashcards', title: 'Flashcards', detail: 'Make the essentials stick', icon: BookOpen, tone: 'violet' },
];

export default function StudyHome({ name, history, completedLabs, onNavigate }: {
  name: string; history: QuizHistoryItem[]; completedLabs: string[]; onNavigate: (tab: Destination) => void;
}) {
  const { track } = useLearningTrack();
  const metrics = homeMetrics(history);
  const report = buildStudyReport({ history });
  const saved = readJSON<SavedQuiz | null>('watchguard-quiz-session-v2', null);
  const resume = !!saved?.current && !saved?.complete;
  const busiestDay = Math.max(1, ...metrics.days.map(day => day.count));

  return <div className="study-home">
    <header className="home-heading">
      <div><p className="eyebrow">YOUR LEARNING WORKSPACE</p><h1>Welcome back, {name}<span>.</span></h1><p>A little practice today. A stronger engineer tomorrow.</p></div>
      <span className="home-streak"><Flame size={18}/><strong>{metrics.streak}</strong> day streak</span>
    </header>

    <section className="home-hero">
      <div className="home-hero-copy">
        <span className="home-track"><ShieldCheck size={15}/>{learningTrackLabels[track]}</span>
        <h2>Build confidence.<br/><span>One session at a time.</span></h2>
        <p>Follow the packet. Find the answer. Understand why.</p>
        <div className="home-hero-actions"><button className="primary-button" onClick={() => onNavigate('quiz')}>{resume ? 'Continue your quiz' : 'Start practicing'}<ArrowRight size={18}/></button><button className="home-text-link" onClick={() => onNavigate('labs')}>Explore the labs<ArrowUpRight size={16}/></button></div>
        {resume && <small>Saved session · {saved.mode === 'mock-exam' ? 'Exam question ' + ((saved.index ?? 0) + 1) + ' of ' + (saved.queue?.length ?? 0) : saved.current?.topic}</small>}
      </div>
      <button className="home-network-art" onClick={() => onNavigate('topology')} aria-label="Explore the topology lab">
        <svg viewBox="0 0 400 280" aria-hidden="true">
          <path className="hero-connection" d="M 50 72 H 120 Q 150 72 150 104 V 140 H 205 M 50 217 H 120 Q 150 217 150 180 V 140 M 205 140 H 265 Q 295 140 295 105 V 62 H 355 M 265 140 Q 295 140 295 175 V 224 H 355"/>
          <path className="hero-packet" d="M 50 72 H 120 Q 150 72 150 104 V 140 H 265 Q 295 140 295 175 V 224 H 355"/>
          <g className="hero-endpoint"><rect x="25" y="49" width="50" height="46" rx="12"/><rect x="25" y="194" width="50" height="46" rx="12"/><rect x="330" y="39" width="50" height="46" rx="12"/><rect x="330" y="201" width="50" height="46" rx="12"/></g>
          <g className="hero-device-lines"><path d="M 39 61 H 61 V 77 H 39 Z M 50 77 V 83 M 44 83 H 56 M 342 51 H 367 V 61 H 342 Z M 342 66 H 367 V 76 H 342 Z M 39 208 H 62 V 224 H 39 Z M 45 230 H 57 M 345 219 L 353 227 L 366 214"/></g>
          <rect className="hero-firebox-halo" x="163" y="98" width="84" height="84" rx="24"/>
          <rect className="hero-firebox" x="173" y="108" width="64" height="64" rx="18"/>
          <path className="hero-shield" d="M 205 122 L 219 128 V 140 C 219 151 205 158 205 158 C 205 158 191 151 191 140 V 128 Z M 198 139 L 203 144 L 212 134"/>
          <text x="50" y="116" textAnchor="middle">TRUSTED</text><text x="355" y="107" textAnchor="middle">EXTERNAL</text><text x="355" y="262" textAnchor="middle">VPN</text>
        </svg>
        <span>Explore the network<ArrowUpRight size={14}/></span>
      </button>
    </section>

    <section aria-label="Lifetime progress"><div className="home-section-title"><h2>Your progress</h2><span>Lifetime · all tracks</span></div><OverviewStats score={metrics.accuracy === null ? '—' : metrics.accuracy + '%'} completedLabs={completedLabs} history={history}/></section>

    <section aria-label="Study shortcuts" className="home-shortcuts">{shortcuts.map(({ tab, title, detail, icon: Icon, tone }) => <button key={tab} className={'study-shortcut tone-' + tone} onClick={() => onNavigate(tab)}><span className="shortcut-icon"><Icon size={21}/></span><ArrowUpRight className="shortcut-arrow" size={17}/><strong>{title}</strong><span>{detail}</span></button>)}</section>

    <div className="home-grid">
      <section className="home-card"><div className="home-card-title"><h2><Target size={18}/>Topic accuracy</h2><span>Practice results</span></div><p>A clearer picture of what you know and what to revisit.</p>
        {metrics.topics.length ? metrics.topics.slice(0, 6).map(t => <div className="mastery-row" key={t.topic}><div><span>{t.topic}</span><small>{t.correct}/{t.total} · <b>{t.percent}%</b></small></div><progress value={t.correct} max={t.total} aria-label={t.topic + ' accuracy'}/></div>) : <div className="home-empty"><Target size={30}/><strong>Your progress starts with one answer.</strong><span>Practice a few questions to reveal your topic strengths.</span></div>}
        <div className="home-card-actions"><button className="home-text-link" onClick={() => onNavigate('quiz')}>Practice a weak topic<ArrowRight size={15}/></button>{track !== 'cloud' && <button className="home-text-link" onClick={() => onNavigate('admin')}>Exam readiness<ArrowUpRight size={15}/></button>}</div>
      </section>
      <section className="home-card"><div className="home-card-title"><h2><Activity size={18}/>Study rhythm</h2><span>Last 7 days</span></div><p>Small, consistent sessions add up.</p>
        <div className="activity-week">{metrics.days.map(day => <div key={day.key} title={day.label + ': ' + day.count + ' answers'}><div className={day.count ? 'has-activity' : ''} style={{ '--activity-height': Math.max(5, day.count / busiestDay * 100) + '%' } as CSSProperties}><span>{day.count}</span><i aria-hidden="true"/></div><small>{day.label.split(',')[0]}</small></div>)}</div>
        <div className="accuracy-trend"><div><span>{metrics.previous === null ? '—' : metrics.previous + '%'}</span><small>Previous {metrics.previousCount} answers</small></div><ArrowRight size={18}/><div><span>{metrics.recent === null ? '—' : metrics.recent + '%'}</span><small>Latest {metrics.recentCount} answers</small></div></div>
        <p className="home-footnote">Activity uses dated answers. Accuracy is practice performance, not an exam prediction.</p>
      </section>
    </div>
    <section className="home-next"><div className="home-next-icon"><GraduationCap size={26}/></div><div><h2>Take it from theory to practice.</h2><p>{report.recommendedLabs.length ? 'Suggested from missed topics: ' + report.recommendedLabs.slice(0, 2).join(', ') : 'Try a guided lab, then put the same idea to the test in the sandbox.'}</p></div><button className="secondary-button" onClick={() => onNavigate('sandbox')}>Open sandbox<ArrowUpRight size={16}/></button></section>
  </div>;
}
