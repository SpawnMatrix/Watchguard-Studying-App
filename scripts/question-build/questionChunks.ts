import type { Plugin } from 'vite';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { Question } from '../../src/data/questions.ts';

/** Partition the canonical, revised bank at build time; no second authored source to maintain. */
export function questionChunks(): Plugin {
  // Keep the legacy authoring graph out of the config loader. tsx is a build-only dependency.
  const { studyQuestions, qaIds } = JSON.parse(execFileSync(process.execPath,
    ['--import', 'tsx', path.resolve('scripts/question-build/exportQuestions.ts')],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })) as { studyQuestions: Question[]; qaIds: number[] };
  return {
    name: 'question-track-chunks',
    resolveId(id) { if (id.startsWith('virtual:questions/')) return '\0' + id; },
    load(id) {
      if (!id.startsWith('\0virtual:questions/')) return;
      const name = id.slice('\0virtual:questions/'.length);
      if (name === 'index') return `export default ${JSON.stringify(studyQuestions.map(q => ({ id: q.id, track: q.track ?? 'local', topic: q.topic })))}; export const qaIds = ${JSON.stringify(qaIds)};`;
      if (!['local', 'cloud', 'network-plus'].includes(name)) throw new Error('Unknown question track');
      // Reuse citations and shared diagram objects within each track chunk.
      const shared: string[] = [];
      const questions = studyQuestions.filter(q => !q.variant && (q.track ?? 'local') === name);
      const counts = new Map<string, number>();
      const visit = (value: unknown) => {
        if (typeof value === 'string' && value.length > 24) counts.set(value, (counts.get(value) ?? 0) + 1);
        else if (value && typeof value === 'object') Object.values(value).forEach(visit);
      };
      questions.forEach(visit);
      const strings = [...counts].filter(([, count]) => count > 1).map(([value]) => value);
      const indices = new Map(strings.map((value, i) => [value, i]));
      const encode = (value: unknown): string => {
        if (typeof value === 'string' && indices.has(value)) return `strings[${indices.get(value)}]`;
        if (Array.isArray(value)) return '[' + value.map(encode).join(',') + ']';
        if (value && typeof value === 'object') return '{' + Object.entries(value).map(([k, v]) => JSON.stringify(k) + ':' + encode(v)).join(',') + '}';
        return JSON.stringify(value);
      };
      const rows = questions.map(q => '{' + Object.entries(q).map(([key, value]) => {
        let code = encode(value);
        if (key === 'sources' || key === 'topology') {
          let index = shared.indexOf(code);
          if (index < 0) { index = shared.length; shared.push(code); }
          code = `shared[${index}]`;
        }
        return `${JSON.stringify(key)}:${code}`;
      }).join(',') + '}');
      return `const strings=${JSON.stringify(strings)}; const shared=[${shared.join(',')}]; export default [${rows.join(',')}];`;
    },
  };
}
