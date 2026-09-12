import { ArrowRight, BookOpen, Target, Activity, Route } from 'lucide-react';
import type { QuizHistoryItem } from './QuizAnalyticsPanel';
import { homeMetrics } from '../engine/homeMetrics';
import { buildStudyReport } from '../engine/progress';
import { useLearningTrack, learningTrackLabels } from '../engine/LearningTrack';
import { readJSON } from '../account/storage';
import OverviewStats from './dashboard/OverviewStats';

export default function StudyHome({name,history,completedLabs,onNavigate}:{name:string;history:QuizHistoryItem[];completedLabs:string[];onNavigate:(tab:'quiz'|'labs'|'sandbox'|'flashcards')=>void}) {
  const {track}=useLearningTrack(),metrics=homeMetrics(history),report=buildStudyReport({history});
  const saved=readJSON<any>('watchguard-quiz-session-v2',null);
  const resume=!!saved?.current&&!saved?.complete;
  return <div className="space-y-6">
    <section className="home-hero"><div><p className="eyebrow">YOUR STUDY BRIEFING</p><h1>Welcome back, {name}.</h1><p>Build the habits. Understand the network.</p><span className="home-track">{learningTrackLabels[track]}</span><button className="primary-button" onClick={()=>onNavigate('quiz')}>{resume?'Continue your quiz':'Start practicing'}<ArrowRight size={18}/></button>{resume&&<small>Saved session · {saved.mode === 'mock-exam' ? `Exam question ${saved.index+1} of ${saved.queue.length}` : saved.current.topic}</small>}</div><div className="home-signal" aria-hidden="true"><Route size={78} strokeWidth={1}/><span>LEARN / APPLY / REVIEW</span></div></section>
    <div><p className="eyebrow mb-3">LIFETIME PROGRESS · ALL TRACKS</p><OverviewStats score={metrics.accuracy===null?'—':`${metrics.accuracy}%`} completedLabs={completedLabs} history={history}/></div>
    <div className="home-grid">
      <section className="home-card"><h2><Target size={19}/>Topic accuracy</h2><p>Observed practice results, not an exam pass prediction.</p>{metrics.topics.length?metrics.topics.slice(0,6).map(t=><div className="mastery-row" key={t.topic}><div><span>{t.topic}</span><small>{t.correct}/{t.total} · {t.percent}%</small></div><progress value={t.correct} max={t.total} aria-label={`${t.topic} accuracy`}/></div>):<div className="home-empty">Your topic map starts with your first answer.</div>}<button className="secondary-button" onClick={()=>onNavigate('quiz')}>Practice a weak topic<ArrowRight size={16}/></button></section>
      <section className="home-card"><h2><Activity size={19}/>Study rhythm</h2><p>{metrics.streak} day{metrics.streak===1?'':'s'} in your current quiz streak</p><div className="activity-week">{metrics.days.map(day=><div key={day.key} title={`${day.label}: ${day.count} answers`}><div className={day.count?'has-activity':''}><span>{day.count}</span></div><small>{day.label.split(',')[0]}</small></div>)}</div><p className="text-xs">Last seven days · answers with recorded dates</p><div className="accuracy-trend"><div><span>{metrics.recent===null?'—':`${metrics.recent}%`}</span><small>Latest {metrics.recentCount} answers</small></div><ArrowRight size={18}/><div><span>{metrics.previous===null?'—':`${metrics.previous}%`}</span><small>Previous {metrics.previousCount} answers</small></div></div></section>
      <section className="home-card home-next"><h2><BookOpen size={19}/>Put it into practice</h2><p>{report.recommendedLabs.length?`Suggested from missed topics: ${report.recommendedLabs.slice(0,2).join(', ')}`:'Explore a guided lab, then test the same idea in the sandbox.'}</p><div className="flex gap-3 flex-wrap"><button className="secondary-button" onClick={()=>onNavigate('labs')}>Open lab exercises<ArrowRight size={16}/></button><button className="secondary-button" onClick={()=>onNavigate('sandbox')}>Network sandbox<ArrowRight size={16}/></button><button className="secondary-button" onClick={()=>onNavigate('flashcards')}>Review flashcards<ArrowRight size={16}/></button></div></section>
    </div>
  </div>;
}
