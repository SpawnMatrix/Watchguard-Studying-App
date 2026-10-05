import { studyQuestions, qaQuestions } from '../../src/engine/catalog';
process.stdout.write(JSON.stringify({ studyQuestions, qaIds: qaQuestions.map(q => q.id) }));
