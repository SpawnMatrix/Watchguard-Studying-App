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
