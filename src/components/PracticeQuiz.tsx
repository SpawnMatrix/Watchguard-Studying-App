import { ArrowRight, RotateCcw, CheckCircle2, BookOpen, ExternalLink, Sparkles } from 'lucide-react';
import StandardQuizzer from './StandardQuizzer';
import TopologyQuizzer from './TopologyQuizzer';
import LogSimulator from './LogSimulator';
import QuizEvaluation from './QuizEvaluation';
import QuizAnalyticsPanel, { type QuizHistoryItem } from './QuizAnalyticsPanel';
import { useQuizEngine, type QuizMode } from '../engine/useQuizEngine';
import { studyQuestions, type ContentMode } from '../engine/catalog';
import { trackLabels, type Track } from '../engine/types';

export type { QuizHistoryItem };
interface PracticeQuizProps {onScoreUpdated:(record:{score:string;topicWeaknesses:string[];history:QuizHistoryItem[]})=>void}
export default function PracticeQuiz({onScoreUpdated}:PracticeQuizProps) {
  const engine=useQuizEngine(onScoreUpdated);
  const {session:s,deck,loading,notice,correctCount,filtered}=engine;
  const q=s.current;
  const topics=['All',...new Set(studyQuestions.filter(item=>s.filters.track==='all'||(item.track??'local')===s.filters.track).map(item=>item.topic))];
  const rendererProps=q?{question:q,selectedOptions:s.selected,isSubmitted:!!s.evaluation,isLoading:loading,onOptionToggle:engine.toggle}:null;
  const examHistory=s.history.slice(s.examStart);
  return <div className="quiz-workspace">
    <header className="section-heading"><div><p className="eyebrow">PRACTICE & APPLY</p><h1>Build understanding. Test your instincts.</h1><p>Real configuration decisions, fresh scenarios, and explanations you can check.</p></div><span className="catalog-count"><BookOpen size={16}/>{studyQuestions.filter(item=>!item.variant).length} questions · 30 scenario types</span></header>
    <div className="quiz-filters">
      <label>Study mode<select aria-label="Study mode" disabled={loading} value={s.mode} onChange={e=>engine.configure(e.target.value as QuizMode)}><option value="practice">Practice Mode</option><option value="mock-exam">Mock Exam · up to 50 questions</option><option value="weakness-review">Review Weak Points</option></select></label>
      <label>Learning track<select aria-label="Learning track" disabled={loading||s.mode==='weakness-review'} value={s.filters.track} onChange={e=>engine.configure(s.mode,{...s.filters,track:e.target.value as Track|'all',topic:'All'})}><option value="all">All tracks</option>{Object.entries(trackLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label>Topic<select aria-label="Topic" disabled={loading||s.mode==='weakness-review'} value={s.filters.topic} onChange={e=>engine.configure(s.mode,{...s.filters,topic:e.target.value})}>{topics.map(topic=><option key={topic}>{topic}</option>)}</select></label>
      <label>Question pool<select aria-label="Question pool" disabled={loading||s.mode==='weakness-review'} value={s.filters.content} onChange={e=>engine.configure(s.mode,{...s.filters,content:e.target.value as ContentMode})}><option value="mixed">Questions + scenarios</option><option value="authored">Authored questions</option><option value="generated">Fresh scenarios</option></select></label>
    </div>
    <div className="quiz-columns"><section className="question-panel" aria-label="Current question">
      <div className="question-meta"><span>{s.mode==='mock-exam'?`Question ${Math.min(s.index+1,s.queue.length)} of ${s.queue.length}`:s.mode==='weakness-review'?`${Object.keys(deck).length} concepts to review`:'Practice session'}</span><div className="flex gap-2 flex-wrap">{q&&<span className="topic-tag">{q.topic}</span>}{q?.variant&&<span className="variant-tag"><Sparkles size={13}/>Fresh scenario</span>}</div></div>
      {s.mode==='mock-exam'&&<progress className="exam-progress" value={s.index+(s.evaluation?1:0)} max={s.queue.length} aria-label="Exam progress"/>}
      <div className="question-body">
        {!q&&<div className="quiz-empty"><CheckCircle2 size={42}/><h2>{s.complete?'Exam complete':s.mode==='weakness-review'?'Review complete':'No questions in this selection'}</h2><p>{s.complete?`${examHistory.filter(h=>h.isCorrect).length} of ${examHistory.length} correct · ${examHistory.length?Math.round(examHistory.filter(h=>h.isCorrect).length/examHistory.length*100):0}%`:s.mode==='weakness-review'?'Your weakness deck is clear. Missed concepts return here until you answer them correctly three times.':'Try another topic or question pool.'}</p>{s.complete&&<button className="primary-button" onClick={()=>engine.configure('mock-exam')}>Start another exam</button>}</div>}
        {q&&rendererProps&&<>{q.type==='topology'?<TopologyQuizzer {...rendererProps}/>:q.type==='log'?<LogSimulator {...rendererProps}/>:<StandardQuizzer {...rendererProps}/>}
          {s.mode==='weakness-review'&&<p className="review-streak">Correct streak: {deck[q.id]??3}/3</p>}
        </>}
        {notice&&<p className="quiz-notice" role="status">{notice}</p>}
        {s.evaluation&&<div aria-live="polite"><QuizEvaluation evaluation={s.evaluation}/></div>}
        {s.evaluation&&q?.sources&&<div className="question-sources"><strong>Check the reasoning</strong>{q.sources.map((source,i)=><div key={i}>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalLink size={13}/></a>:<span>{source.title}</span>}{source.section&&<p>{source.section}</p>}</div>)}{q.firewareVersion&&<p>{q.firewareVersion}. Verify version-specific settings on your device.</p>}</div>}
      </div>
      <div className="question-actions"><button className="secondary-button" disabled={loading} onClick={engine.reset}><RotateCcw size={15}/>Reset statistics</button>{q&&<button className="primary-button" disabled={loading||(!s.evaluation&&!s.selected.length)} onClick={s.evaluation?engine.next:engine.submit}>{loading?'Getting feedback…':s.evaluation?s.mode==='mock-exam'&&s.index===s.queue.length-1?'Finish exam':'Next question':'Check answer'}<ArrowRight size={17}/></button>}</div>
    </section><QuizAnalyticsPanel quizHistory={s.mode==='mock-exam'?examHistory:s.history} correctCount={s.mode==='mock-exam'?examHistory.filter(h=>h.isCorrect).length:correctCount} totalQuestions={s.mode==='mock-exam'?s.queue.length:filtered.length}/></div>
  </div>;
}
