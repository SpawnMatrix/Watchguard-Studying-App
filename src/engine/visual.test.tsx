import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { studyQuestions, materialize } from './catalog';
import { questionTopology } from './topologyAdapters';
import { homeMetrics } from './homeMetrics';
import { parseTrack } from './LearningTrack';
import NetworkTopology from '../components/NetworkTopology';
import type { TopologyDiagramData } from './topology';

describe('topology compatibility and interactions',()=>{
  it('renders every current topology question without losing its answer keys',()=>{
    for(const original of studyQuestions.filter(q=>q.type==='topology'))for(const seed of [1,22,993]){
      const q=materialize(original,seed);
      const before=JSON.stringify(q),d=questionTopology(q)!;
      expect(d).toBeDefined();expect(d.nodes.length).toBeGreaterThan(0);
      expect(new Set(d.nodes.map(n=>n.id)).size).toBe(d.nodes.length);
      for(const edge of d.edges){expect(d.nodes.some(n=>n.id===edge.from)).toBe(true);expect(d.nodes.some(n=>n.id===edge.to)).toBe(true);}
      for(const spot of d.hotspots||[]){expect(q.options).toContain(spot.answer);expect((spot.target==='node'?d.nodes:d.edges).some(n=>n.id===spot.targetId)).toBe(true);}
      // 203 and 208 no longer reach the image-name adapter: they carry their own contract-v1
      // diagrams (src/data/legacyTopologyScenes.ts), so their hotspots bind to the real option
      // text rather than the placeholder 'Hotspot A/B/C' labels the adapter synthesised.
      // Same assertion, pointed at the data that now backs those questions.
      if(q.id===208)expect(d.hotspots?.find(h=>h.targetId==='rtr')?.answer).toBe('Edge router');
      if(q.id===203)expect(d.hotspots?.find(h=>h.targetId==='vpn')?.answer).toBe('The Firebox-to-Internet link');
      const html=renderToStaticMarkup(<NetworkTopology diagram={d}/>);
      expect(html).toContain('<svg');expect(html).not.toContain('[Topology Diagram:');expect(JSON.stringify(q)).toBe(before);
    }
  });
  it('binds node and edge answers by ID and reveals correctness only after submission',()=>{
    const diagram:TopologyDiagramData={version:1,title:'Test diagram',width:700,height:300,nodes:[{id:'a',kind:'client',label:'Client',x:120,y:150},{id:'b',kind:'firebox',label:'Firebox',x:580,y:150}],edges:[{id:'link',from:'a',to:'b',flow:true}],hotspots:[{target:'node',targetId:'a',answer:'Client'},{target:'edge',targetId:'link',answer:'Link'}]};
    const props={diagram,selected:['Client'],correct:['Link'],onSelect:()=>{}};
    const before=renderToStaticMarkup(<NetworkTopology {...props}/>);
    expect(before).toContain('aria-pressed="true"');expect(before).not.toContain('is-correct');expect(before).not.toContain('is-incorrect');
    const after=renderToStaticMarkup(<NetworkTopology {...props} submitted/>);
    expect(after).toContain('is-correct');expect(after).toContain('is-incorrect');expect(after).toContain('Link — correct answer');expect(after).toContain('Client — incorrect answer');expect(after).toContain('aria-disabled="true"');
  });
});
describe('observed progress and track defaults',()=>{
  const answer=(isCorrect:boolean,answeredAt?:string)=>({questionId:1,topic:'Routing',isCorrect,answeredAt,explanation:'',selectedAnswers:[]});
  it('keeps undated history in accuracy but never invents activity',()=>{
    const m=homeMetrics([answer(true),answer(false,'invalid')],new Date(2026,8,11,12));
    expect(m.accuracy).toBe(50);expect(m.streak).toBe(0);expect(m.days.every(d=>d.count===0)).toBe(true);
  });
  it('counts local calendar streaks, including yesterday, and excludes future activity',()=>{
    const m=homeMetrics([answer(true,new Date(2026,8,10,10).toISOString()),answer(false,new Date(2026,8,9,10).toISOString()),answer(true,new Date(2026,8,12,10).toISOString())],new Date(2026,8,11,12));
    expect(m.streak).toBe(2);expect(m.days.reduce((n,d)=>n+d.count,0)).toBe(2);
  });
  it('uses supported tracks and a local default for invalid preferences',()=>{
    expect(parseTrack('cloud')).toBe('cloud');expect(parseTrack('network-plus')).toBe('network-plus');expect(parseTrack('all')).toBe('local');expect(parseTrack(null)).toBe('local');
  });
});
