import { describe, expect, it } from 'vitest';
import { createExam, filterQuestions, filtersForNewSession, studyQuestions, type QuestionFilters, type QuestionFormat } from './catalog';
import { topologyEdgeGeometry } from './topologyGeometry';
import { validStudyValue } from '../account/schema';

describe('focused practice filters',()=>{
  it('partitions every question by format without losing legacy multiple-choice items',()=>{
    const formats:QuestionFormat[]=['standard','topology','log','ordering'];
    const ids=formats.flatMap(format=>{
      const pool=filterQuestions({format});
      expect(pool.every(q=>(q.type??'standard')===format)).toBe(true);
      return pool.map(q=>q.id);
    });
    expect(ids.sort((a,b)=>a-b)).toEqual(studyQuestions.map(q=>q.id).sort((a,b)=>a-b));
    expect(filterQuestions()).toEqual(filterQuestions({format:'all'}));
  });
  it('combines format, topic, track and generation filters through exam creation',()=>{
    const pool=filterQuestions({track:'local',topic:'Routing',content:'generated',format:'topology'});
    expect(pool.length).toBeGreaterThan(0);
    const exam=createExam(pool,723);
    expect(exam).toHaveLength(50);
    for(const q of exam){expect(q.type).toBe('topology');expect(q.track).toBe('local');expect(q.topic).toBe('Routing');expect(q.variant).toBeDefined();}
  });
  it('adopts the global track only through an explicit new-session filter calculation',()=>{
    const saved:QuestionFilters={track:'local',topic:'NAT',content:'generated',format:'topology'};
    expect(filtersForNewSession(saved,'cloud')).toEqual({...saved,track:'cloud',topic:'All'});
    expect(filtersForNewSession(saved,'local')).toEqual(saved);
    expect(saved.track).toBe('local');expect(saved.topic).toBe('NAT');
  });
  it('accepts format-aware snapshots and snapshots saved before the format filter existed',()=>{
    const current=studyQuestions[0];
    const session={mode:'practice',filters:{track:'local',topic:'All',content:'mixed'},current,queue:[],index:0,selected:[],evaluation:null,history:[],seen:[],examStart:0,complete:false};
    expect(validStudyValue('watchguard-quiz-session-v2',JSON.stringify(session))).toBe(true);
    expect(validStudyValue('watchguard-quiz-session-v2',JSON.stringify({...session,filters:{...session.filters,format:'topology'}}))).toBe(true);
  });
});

describe('link label placement',()=>{
  const from={id:'a',kind:'switch' as const,label:'Switch',x:400,y:230};
  it('keeps a vertical link label in the gap, outside the upper node card',()=>{
    const geometry=topologyEdgeGeometry(from,{...from,id:'b',y:370},'Access link');
    expect(geometry.labelY).toBeGreaterThan(from.y+60+10);
    expect(geometry.labelY).toBeLessThan(370-60);
    expect(geometry.anchor).toBe('start');expect(geometry.labelX).toBeGreaterThan(from.x);
  });
  it('moves long horizontal labels above cards instead of underneath them',()=>{
    const geometry=topologyEdgeGeometry(from,{...from,id:'b',x:670},'Eth0 default route');
    expect(geometry.labelY).toBeLessThan(from.y-60);
  });
});
