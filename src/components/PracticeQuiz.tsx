import { useLearningTrack } from '../engine/LearningTrack';
import { useEffect } from 'react';
import { ArrowRight, RotateCcw, CheckCircle2, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import StandardQuizzer from './StandardQuizzer';
import TopologyQuizzer from './TopologyQuizzer';
import LogSimulator from './LogSimulator';
import PolicyOrderer from './PolicyOrderer';
import ExplainLikeL1 from './ExplainLikeL1';
import QuizEvaluation from './QuizEvaluation';
import QuizAnalyticsPanel, { type QuizHistoryItem } from './QuizAnalyticsPanel';
import { useQuizEngine, type QuizMode, type QuizLaunch } from '../engine/useQuizEngine';
import { studyQuestions, formatLabels, filtersForNewSession, type ContentMode, type QuestionFormat } from '../engine/catalog';
import { trackLabels } from '../engine/types';
import { BOX_COUNT, retainedCount, weakestTopics } from '../engine/srs';

export type { QuizHistoryItem };
interface PracticeQuizProps {onScoreUpdated:(record:{score:string;topicWeaknesses:string[];history:QuizHistoryItem[]})=>void;launch?:QuizLaunch|null;onLaunchConsumed?:()=>void}
export default function PracticeQuiz({onScoreUpdated,launch,onLaunchConsumed}:PracticeQuizProps) {
  const {track}=useLearningTrack();
  const engine=useQuizEngine(onScoreUpdated,track,launch);
  useEffect(()=>{if(launch)onLaunchConsumed?.();},[launch]);
  const {session:s,deck,srs,loading,notice,correctCount,filtered}=engine;
  const focus=weakestTopics(srs,3);
  const q=s.current;
  const topics=['All',...new Set(studyQuestions.filter(item=>s.filters.track==='all'||(item.track??'local')===s.filters.track).map(item=>item.topic))];
  const rendererProps=q?{question:q,selectedOptions:s.selected,isSubmitted:!!s.evaluation,isLoading:loading,onOptionToggle:engine.toggle}:null;
  const examHistory=s.history.slice(s.examStart);
  return <div className="quiz-workspace">
    <header className="section-heading"><div><p className="eyebrow">PRACTICE & APPLY</p><h1>Build understanding. Test your instincts.</h1><p>Real configuration decisions, fresh scenarios, and explanations you can check.</p></div><span className="catalog-count"><BookOpen size={16}/>{studyQuestions.filter(item=>!item.variant).length} questions · {new Set(studyQuestions.filter(item=>item.variant).map(item=>item.id)).size} scenario types</span></header>
    {focus.length>0&&<p className="srs-focus" role="status">Spaced repetition is prioritising {focus.map(item=>`${item.topic} (${Math.round(item.accuracy*100)}%)`).join(', ')} · {retainedCount(srs)} concepts retained at box {BOX_COUNT}</p>}
    {s.filters.track!==track && <div className="track-notice" role="status"><span>Your saved {s.filters.track==='all'?'All tracks':trackLabels[s.filters.track]} session is ready to resume. The header track applies when you start a new session.</span><button className="secondary-button" disabled={loading} onClick={()=>engine.configure(s.mode,{...s.filters,track,topic:'All'})}>Start {trackLabels[track]} session</button></div>}
    {s.mode==='weakness-review' && <p className="track-notice">Weakness review includes missed concepts from all tracks.</p>}
    <details className="quiz-filter-drawer"><summary>Practice settings <span>{s.mode==='mock-exam'?'Mock exam':s.mode==='weakness-review'?'Weakness review':'Practice'} · {s.filters.topic} · {s.filters.content} · {formatLabels[s.filters.format??'all']}</span></summary><div className="quiz-filters">
      <label>Study mode<select aria-label="Study mode" disabled={loading} value={s.mode} onChange={e=>engine.configure(e.target.value as QuizMode,filtersForNewSession(s.filters,track))}><option value="practice">Practice Mode</option><option value="mock-exam">Mock Exam · up to 50 questions</option><option value="weakness-review">Review Weak Points</option></select></label>

      <label>Topic<select aria-label="Topic" disabled={loading||s.mode==='weakness-review'} value={s.filters.topic} onChange={e=>engine.configure(s.mode,{...s.filters,topic:e.target.value})}>{topics.map(topic=><option key={topic}>{topic}</option>)}</select></label>
      <label>Question pool<select aria-label="Question pool" disabled={loading||s.mode==='weakness-review'} value={s.filters.content} onChange={e=>engine.configure(s.mode,{...s.filters,content:e.target.value as ContentMode})}><option value="mixed">Questions + scenarios</option><option value="authored">Authored questions</option><option value="generated">Fresh scenarios</option></select></label>
      <label>Question format<select aria-label="Question format" disabled={loading||s.mode==='weakness-review'} value={s.filters.format??'all'} onChange={e=>engine.configure(s.mode,{...s.filters,format:e.target.value as QuestionFormat})}>{Object.entries(formatLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div></details>
    <div className={`quiz-columns ${q?.type==='topology'?'has-topology':''}`}><section className="question-panel" aria-label="Current question">
      <div className="question-meta"><span>{s.mode==='mock-exam'?`Question ${Math.min(s.index+1,s.queue.length)} of ${s.queue.length}`:s.mode==='weakness-review'?`${Object.keys(deck).length} concepts to review`:'Practice session'}</span><div className="flex gap-2 flex-wrap">{q&&<span className="topic-tag">{q.topic}</span>}{q?.variant&&<span className="variant-tag"><Sparkles size={13}/>Fresh scenario</span>}</div></div>
      {s.mode==='mock-exam'&&<progress className="exam-progress" value={s.index+(s.evaluation?1:0)} max={s.queue.length} aria-label="Exam progress"/>}
      <div className="question-body">
        {!q&&<div className="quiz-empty"><CheckCircle2 size={42}/><h2>{s.complete?'Exam complete':s.mode==='weakness-review'?'Review complete':'No questions in this selection'}</h2><p>{s.complete?`${examHistory.filter(h=>h.isCorrect).length} of ${examHistory.length} correct · ${examHistory.length?Math.round(examHistory.filter(h=>h.isCorrect).length/examHistory.length*100):0}%`:s.mode==='weakness-review'?'Your weakness deck is clear. Missed concepts return here until you answer them correctly three times.':'Try another topic or question pool.'}</p>{s.complete&&<button className="primary-button" onClick={()=>engine.configure('mock-exam',filtersForNewSession(s.filters,track))}>Start another exam</button>}</div>}
        {q&&rendererProps&&<>{q.type==='topology'?<TopologyQuizzer {...rendererProps}/>:q.type==='log'?<LogSimulator {...rendererProps}/>:q.type==='ordering'?<PolicyOrderer {...rendererProps} onOrderChange={engine.setOrder}/>:<StandardQuizzer {...rendererProps}/>}
          {s.mode==='weakness-review'&&<p className="review-streak">Correct streak: {deck[q.id]??3}/3</p>}
        </>}
        {notice&&<p className="quiz-notice" role="status">{notice}</p>}
        {s.evaluation&&<div aria-live="polite"><QuizEvaluation evaluation={s.evaluation}/></div>}
        {s.evaluation&&!s.evaluation.isCorrect&&q&&<ExplainLikeL1 question={q} selectedAnswers={s.selected}/>}
        {s.evaluation&&q?.sources&&<div className="question-sources"><strong>Check the reasoning</strong>{q.sources.map((source,i)=><div key={i}>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13}/></a>:<span>{source.title}</span>}{source.section&&<p>{source.section}</p>}</div>)}{q.firewareVersion&&<p>{q.firewareVersion}. Verify version-specific settings on your device.</p>}</div>}
      </div>
      <div className="question-actions"><button className="secondary-button" disabled={loading} onClick={engine.reset}><RotateCcw size={15}/>Reset statistics</button>{q&&<button className="primary-button" disabled={loading||(!s.evaluation&&!s.selected.length)} onClick={s.evaluation?engine.next:engine.submit}>{loading?'Getting feedback…':s.evaluation?s.mode==='mock-exam'&&s.index===s.queue.length-1?'Finish exam':'Next question':'Check answer'}<ArrowRight size={17}/></button>}</div>
    </section><QuizAnalyticsPanel quizHistory={s.mode==='mock-exam'?examHistory:s.history} correctCount={s.mode==='mock-exam'?examHistory.filter(h=>h.isCorrect).length:correctCount} totalQuestions={s.mode==='mock-exam'?s.queue.length:filtered.length}/></div>
  </div>;
}
