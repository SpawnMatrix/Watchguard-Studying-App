import { advanceWeakness } from './weakness';
import { emptySrsState, parseSrsState, recordAnswer, weightedPick, type SrsState } from './srs';
import { useEffect, useRef, useState } from 'react';
import type { Question } from '../data/questions';
import type { QuizHistoryItem } from '../components/QuizAnalyticsPanel';
import type { EvaluationData } from '../components/QuizEvaluation';
import { filterQuestions, createExam, materialize, questionById, type ContentMode } from './catalog';
import { gradeQuestion } from './grading';
import { newSeed, pick, seededRandom } from './random';
import type { Track } from './types';
import { readJSON, writeStudyValue } from '../account/storage';

export type QuizMode='practice'|'mock-exam'|'weakness-review';
interface Filters {topic:string;track:Track|'all';content:ContentMode}
interface Session {
  mode:QuizMode;filters:Filters;current:Question|null;queue:Question[];index:number;
  selected:string[];evaluation:EvaluationData|null;history:QuizHistoryItem[];seen:number[];
  examStart:number;complete:boolean;
}
const SESSION_KEY='watchguard-quiz-session-v2';
const SRS_KEY='watchguard-srs-v1';
const DEFAULT_FILTERS:Filters={topic:'All',track:'local',content:'mixed'};
function first(mode:QuizMode,filters:Filters,deck:Record<number,number>,history:QuizHistoryItem[]=[],srs:SrsState=emptySrsState()):Session {
  const pool=mode==='weakness-review'?Object.keys(deck).map(Number).map(id=>questionById.get(id)).filter((q):q is Question=>!!q):filterQuestions(filters);
  const queue=mode==='mock-exam'?createExam(pool,newSeed()):[];
  // Spaced repetition biases which question comes next; it never changes the
  // pool itself, so every existing filter and mode keeps its meaning.
  const q=mode==='mock-exam'?queue[0]:pool.length?materialize(weightedPick(seededRandom(newSeed()),pool,srs)??pick(seededRandom(newSeed()),pool)):null;
  return {mode,filters,queue,index:0,current:q??null,selected:[],evaluation:null,history,seen:q?[q.id]:[],examStart:history.length,complete:false};
}
function load(deck:Record<number,number>,track:Track):Session {
  const saved=readJSON<Session|null>(SESSION_KEY,null);
  if(saved&&['practice','mock-exam','weakness-review'].includes(saved.mode)&&saved.filters&&Array.isArray(saved.history)&&Array.isArray(saved.queue)&&Array.isArray(saved.selected)&&Array.isArray(saved.seen)&&Number.isInteger(saved.index)&&Number.isInteger(saved.examStart)&&
      (!saved.current||(questionById.has(saved.current.id)&&Array.isArray(saved.current.options)&&Array.isArray(saved.current.correctAnswers)))) return saved;
  const progress=readJSON<any>('watchguard-study-progress-v1',null);
  return first('practice',{...DEFAULT_FILTERS,track},deck,Array.isArray(progress?.quizStats?.history)?progress.quizStats.history:[],parseSrsState(readJSON<any>(SRS_KEY,null)));
}
export function useQuizEngine(onScoreUpdated:(record:{score:string;topicWeaknesses:string[];history:QuizHistoryItem[]})=>void,track:Track='local') {
  const [deck,setDeck]=useState<Record<number,number>>(()=>readJSON('weakness_deck',{}));
  const [srs,setSrs]=useState<SrsState>(()=>parseSrsState(readJSON<any>(SRS_KEY,null)));
  const [session,setSession]=useState(()=>load(deck,track));
  const [loading,setLoading]=useState(false),[notice,setNotice]=useState('');
  const busy=useRef(false),alive=useRef(true),request=useRef<AbortController|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
  useEffect(()=>{writeStudyValue(SESSION_KEY,JSON.stringify(session));},[session]);
  const correctCount=session.history.filter(h=>h.isCorrect).length;
  const filtered=session.mode==='weakness-review'?Object.keys(deck).map(Number).map(id=>questionById.get(id)).filter((q):q is Question=>!!q):filterQuestions(session.filters);
  const report=(history:QuizHistoryItem[])=>onScoreUpdated({history,score:history.length?`${Math.round(history.filter(h=>h.isCorrect).length/history.length*100)}%`:'0%',topicWeaknesses:[...new Set(history.filter(h=>!h.isCorrect).map(h=>h.topic))]});
  function configure(mode:QuizMode,filters:Filters=session.filters) {
    if(busy.current)return;
    setSession(first(mode,filters,deck,session.history,srs));setNotice('');
  }
  function toggle(option:string) {
    const q=session.current;if(!q||session.evaluation||busy.current)return;
    setSession(s=>({...s,selected:q.isMultiSelect?(s.selected.includes(option)?s.selected.filter(a=>a!==option):[...s.selected,option].slice(-q.correctAnswersCount)):[option]}));
  }
  async function submit() {
    const q=session.current;if(!q||session.evaluation||!session.selected.length||busy.current)return;
    busy.current=true;setLoading(true);setNotice('');
    const isCorrect=gradeQuestion(q,session.selected);
    let explanation=q.explanation??`Correct answer: ${q.correctAnswers.join('; ')}. Review the ${q.topic} study material for the applicable configuration and assumptions.`;
    if(!q.explanation) {
      request.current=new AbortController();const timeout=setTimeout(()=>request.current?.abort(),8000);
      try {
        const customKey=localStorage.getItem('watchguard_custom_gemini_api_key')||localStorage.getItem('gemini_api_key')||'';
        const response=await fetch('/api/quiz/evaluate',{method:'POST',headers:{'Content-Type':'application/json',...(customKey?{'X-Gemini-API-Key':customKey}:{})},signal:request.current.signal,
          body:JSON.stringify({questionId:q.id,question:q.question,options:q.options,selectedOptions:session.selected,selectedAnswer:session.selected.join(' | '),correctAnswer:q.correctAnswer,variant:q.variant})});
        if(!response.ok)throw new Error('Feedback unavailable');
        const data=await response.json();if(typeof data.detailedExplanation==='string'&&data.detailedExplanation)explanation=data.detailedExplanation;
      }catch {if(alive.current)setNotice('Scored locally. Additional tutor feedback is unavailable right now.');}
      finally{clearTimeout(timeout);}
    }
    if(!alive.current){busy.current=false;return;}
    const nextDeck=advanceWeakness(deck,q.id,isCorrect);
    setDeck(nextDeck);writeStudyValue('weakness_deck',JSON.stringify(nextDeck));
    const nextSrs=recordAnswer(srs,q.id,q.topic,isCorrect);
    setSrs(nextSrs);writeStudyValue(SRS_KEY,JSON.stringify(nextSrs));
    const history=[...session.history,{attemptId:crypto.randomUUID(),questionId:q.id,question:q.question,options:[...q.options],correctAnswers:[...q.correctAnswers],variant:q.variant,
      selectedAnswers:[...session.selected],explanation,topic:q.topic,isCorrect,answeredAt:new Date().toISOString()}];
    const next={...session,history,evaluation:{isCorrect,detailedExplanation:explanation,weaknessCategory:q.topic}};
    writeStudyValue(SESSION_KEY,JSON.stringify(next));setSession(next);report(history);busy.current=false;setLoading(false);
  }
  function next() {
    if(!session.evaluation||busy.current)return;
    setNotice('');
    if(session.mode==='mock-exam') {
      const index=session.index+1;
      setSession(s=>({...s,index,current:s.queue[index]??null,selected:[],evaluation:null,complete:index>=s.queue.length}));return;
    }
    let pool=filtered.filter(q=>!session.seen.includes(q.id)),seen=session.seen;
    if(!pool.length){pool=filtered;seen=[];}
    const q=pool.length?materialize(weightedPick(seededRandom(newSeed()),pool,srs)??pick(seededRandom(newSeed()),pool)):null;
    setSession(s=>({...s,current:q,seen:q?[...seen,q.id]:[],selected:[],evaluation:null}));
  }
  function reset(){if(busy.current)return;setSession(first(session.mode,session.filters,deck,[],srs));setNotice('');report([]);}
  /** Replaces the whole selection at once, for ordering questions. */
  function setOrder(order:string[]) {
    if(session.evaluation||busy.current)return;
    setSession(s=>({...s,selected:order}));
  }
  return {session,deck,srs,loading,notice,correctCount,filtered,configure,toggle,submit,next,reset,setOrder};
}
