import { examQuestions, type Question } from '../data/questions';
import { generateQuestion, questionTemplates } from './templates';
import { newSeed, seededRandom, shuffle } from './random';
import type { Track } from './types';

export const studyQuestions: Question[] = [...examQuestions, ...questionTemplates.map(t => generateQuestion({ templateId:t.id, seed:0, version:1 }))];
export const questionById = new Map(studyQuestions.map(q => [q.id,q]));
export type ContentMode = 'mixed' | 'authored' | 'generated';
export function filterQuestions({topic='All',track='all',content='mixed'}: {topic?:string;track?:Track|'all';content?:ContentMode} = {}) {
  return studyQuestions.filter(q => (topic==='All'||q.topic===topic) && (track==='all'||(q.track??'local')===track) &&
    (content==='mixed'||(content==='generated'?!!q.variant:!q.variant)));
}
export function materialize(q: Question, seed=newSeed()): Question {
  return q.variant ? generateQuestion({...q.variant,seed}) : {...q,options:shuffle(q.options,seededRandom(seed))};
}
/** Bounded, repeatable blueprint; rounds prevent one template dominating an exam. */
export function createExam(pool: readonly Question[], seed: number, size=50): Question[] {
  if (!pool.length) return [];
  const rng=seededRandom(seed);
  const result: Question[]=[];
  while (result.length < size) {
    const cycle=shuffle(pool,rng);
    // Every concept gets a turn before a generated template is reused.
    for (const q of cycle) {
      if (result.length===size) break;
      if (!q.variant && result.some(existing=>existing.id===q.id)) continue;
      result.push(materialize(q,Math.floor(rng()*4294967296)));
    }
    if (!pool.some(q=>q.variant)) break;
  }
  return result;
}
