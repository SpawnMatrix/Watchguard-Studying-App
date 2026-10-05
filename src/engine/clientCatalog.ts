import metadata, { qaIds } from 'virtual:questions/index';
import type { Question } from '../data/questions';
import type { Track } from './types';
import { createCatalog } from './catalogCore';
import { generateQuestion, questionTemplates } from './templates';
export * from './catalogCore';

export const { studyQuestions, questionById, filterQuestions, materialize, createExam } = createCatalog([]);
export const questionMetaById = new Map(metadata.map(q => [q.id, q]));
export const qaQuestions: Question[] = [];
const qa = new Set(qaIds);
const order = new Map(metadata.map((q, i) => [q.id, i]));
const loaders = {
  local: () => import('virtual:questions/local'),
  cloud: () => import('virtual:questions/cloud'),
  'network-plus': () => import('virtual:questions/network-plus'),
};
const pending = new Map<Track, Promise<void>>();
async function load(track: Track) {
  if (!pending.has(track)) {
    pending.set(track, loaders[track]().then(({ default: rows }) => {
      const generated = questionTemplates.filter(t => t.track === track).map(t => generateQuestion({ templateId: t.id, seed: 0, version: 1 }));
      for (const q of [...rows, ...generated]) {
        if (questionById.has(q.id)) continue;
        studyQuestions.push(q); questionById.set(q.id, q);
        if (qa.has(q.id)) qaQuestions.push(q);
      }
      studyQuestions.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      qaQuestions.sort((a, b) => qaIds.indexOf(a.id) - qaIds.indexOf(b.id));
    }).catch(error => { pending.delete(track); throw error; }));
  }
  await pending.get(track);
}
/** Cross-track IDs use a small index, never an assumption that a missing ID means Local. */
export async function ensureCatalog(track: Track | 'all', ids: number[] = []) {
  const tracks = new Set<Track>(track === 'all' ? ['local', 'cloud', 'network-plus'] : [track]);
  for (const id of ids) { const row = questionMetaById.get(id); if (row) tracks.add(row.track); }
  await Promise.all([...tracks].map(load));
}
