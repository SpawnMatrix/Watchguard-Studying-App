import { useMemo, useState } from 'react';
import { ArrowRight, Layers, Network, Shuffle, Timer } from 'lucide-react';
import { filterQuestions, materialize } from '../engine/catalog';
import { useLearningTrack, learningTrackLabels } from '../engine/LearningTrack';
import { questionTopology } from '../engine/topologyAdapters';
import { newSeed } from '../engine/random';
import type { QuizLaunch } from '../engine/useQuizEngine';
import NetworkTopology from './NetworkTopology';

export default function TopologyStudio({onPractice}:{onPractice:(launch:QuizLaunch)=>void}) {
  const {track}=useLearningTrack();
  const pool=useMemo(()=>filterQuestions({track,format:'topology'}),[track]);
  const [selectedId,setSelectedId]=useState<number|null>(null),[seed,setSeed]=useState(newSeed);
  const selected=pool.find(q=>q.id===selectedId)??pool[0];
  const question=useMemo(()=>selected?materialize(selected,seed):null,[selected,seed]);
  const diagram=question?questionTopology(question):undefined;
  const filters={track,topic:'All',content:'mixed' as const,format:'topology' as const};
  return <div className="space-y-6">
    <header className="section-heading"><div><p className="eyebrow">TOPOLOGY LAB</p><h1>Read the network. Make the call.</h1><p>Explore zones, routing paths, and VPN links. Then practice the decision behind the diagram.</p></div><span className="catalog-count"><Network size={16}/>{pool.length} diagram scenarios</span></header>
    <div className="topology-study-modes">
      <button className="home-card" disabled={!pool.length} onClick={()=>onPractice({mode:'practice',filters})}><Layers size={22}/><strong>Guided practice</strong><span>One diagram at a time, with explanations after each answer.</span><ArrowRight size={17}/></button>
      <button className="home-card" disabled={!pool.length} onClick={()=>onPractice({mode:'mock-exam',filters})}><Timer size={22}/><strong>Topology mock exam</strong><span>A bounded quiz drawn from this track’s diagrams. Feedback after each answer; no time limit.</span><ArrowRight size={17}/></button>
    </div>
    <p className="text-sm text-gray-400">{learningTrackLabels[track]} · Starting practice replaces the current quiz session and keeps your answer history.</p>
    {!diagram||!question?<div className="home-card"><h2>More diagrams are on the way</h2><p>Choose another learning track to explore the current topology catalog. Other question formats remain available in Practice Quiz.</p></div>:<div className="topology-studio-grid">
      <aside className="topology-catalog" aria-label="Topology scenarios"><h2>Explore a scenario</h2>{pool.map(item=><button key={item.id} aria-pressed={item.id===selected?.id} onClick={()=>{setSelectedId(item.id);setSeed(newSeed());}}><strong>{questionTopology(item)?.title||item.topic}</strong><span>{item.topic}{item.variant?' · Fresh scenario':''}</span></button>)}</aside>
      <section className="space-y-4 min-w-0" aria-label="Topology preview"><NetworkTopology diagram={diagram} defaultFit/><p className="topology-preview-question">{question.question}</p><div className="flex gap-3 flex-wrap"><button className="primary-button" onClick={()=>onPractice({mode:'practice',filters,questionId:question.id,seed})}>Practice this diagram<ArrowRight size={17}/></button>{question.variant&&<button className="secondary-button" onClick={()=>setSeed(newSeed())}><Shuffle size={16}/>New scenario</button>}</div><p className="text-xs text-gray-400">Preview the network here. Practice opens the interactive question, grading, and explanation.</p></section>
    </div>}
  </div>;
}
