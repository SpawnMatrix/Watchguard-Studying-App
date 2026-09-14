import { describe,it,expect } from 'vitest';
import { buildStudyReport } from './progress';
import { watchguardLabs } from '../data/labs';
describe('evidence-based progress reports',()=>{
 it('does not invent strengths or a 65% score with no attempts',()=>{const r=buildStudyReport();expect(r.readinessScore).toBe('0%');expect(r.recommendedLabs).toEqual([]);expect(r.summary).toContain('0 of 0');});
 it('uses observed attempts and recommendations that exist in the lab catalog',()=>{
 const r=buildStudyReport({history:[{topic:'BOVPN',isCorrect:false},{topic:'Routing',isCorrect:true},{topic:'Routing',isCorrect:true},{topic:'Routing',isCorrect:true}]});
 expect(r.readinessScore).toBe('75%');expect(r.strengths).toEqual(['Routing: 3/3 correct']);expect(r.criticalVulnerabilities).toEqual(['Review BOVPN']);expect(r.recommendedLabs).toEqual([watchguardLabs.find(l=>l.id===16)!.name]);
 });
 it('supports existing aggregate API callers without adding a score bonus',()=>{expect(buildStudyReport({totalQuizAttempts:10,correctQuizAnswers:8}).readinessScore).toBe('80%');});
});
describe('lab recommendations',()=>{
 it('recommends labs for the weakest topic first',()=>{
  const miss=(topic:string,n:number,of:number)=>Array.from({length:of},(_,i)=>({topic,isCorrect:i>=n}));
  // Initial Setup missed once in ten; BOVPN missed four times in five.
  const r=buildStudyReport({history:[...miss('Initial Setup',1,10),...miss('BOVPN',4,5)]});
  expect(r.criticalVulnerabilities).toEqual(['Review BOVPN','Review Initial Setup']);
  expect(r.recommendedLabs[0]).toBe(watchguardLabs.find(l=>l.id===16)!.name);
  expect(r.recommendedLabs.slice(1)).toEqual([1,3,17].map(id=>watchguardLabs.find(l=>l.id===id)!.name));
 });
});
