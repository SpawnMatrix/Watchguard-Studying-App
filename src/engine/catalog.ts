import { examQuestions } from '../data/questions';
import { authoredQuestions } from '../data/authoredQuestions';
import { generateQuestion, questionTemplates } from './templates';
import { createCatalog } from './catalogCore';
import type { Track } from './types';
export * from './catalogCore';
export const {studyQuestions,questionById,filterQuestions,materialize,createExam} = createCatalog([...examQuestions, ...questionTemplates.map(t => generateQuestion({templateId:t.id,seed:0,version:1}))]);
export const questionMetaById = questionById;
export const qaQuestions = authoredQuestions;
/** Server and tests already have the full catalog. The browser implementation loads chunks. */
export async function ensureCatalog(_track: Track | 'all', _ids: number[] = []): Promise<void> {}
