import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * What a visitor downloads before seeing anything.
 *
 * Everything statically imported from main.tsx lands in the entry chunk. By 1.27.0 that included
 * the motion animation library, every step of all 20 labs and the full text of every release note,
 * none of which the first screen needs. This walks the static import graph, ignoring `import type`
 * and dynamic `import()`, which become separate chunks, and fails if the first load reaches any of
 * them again.
 */
const src = path.resolve(__dirname);
const STATIC = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;

function resolve(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')])
    if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  return null;
}

function firstLoad() {
  const files = new Set<string>(), packages = new Set<string>();
  const queue = [path.join(src, 'main.tsx')];
  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(STATIC)) {
      const local = resolve(file, spec);
      if (local) queue.push(local); else if (!spec.startsWith('.')) packages.add(spec);
    }
  }
  return { files: [...files].map(f => path.relative(src, f).replace(/\\/g, '/')), packages: [...packages] };
}

describe('first load', () => {
  const { files, packages } = firstLoad();

  it('finds the shell, so the walk itself is working', () => {
    expect(files).toEqual(expect.arrayContaining(['main.tsx', 'App.tsx', 'account/AccountGate.tsx', 'components/StudyHome.tsx']));
    expect(packages).toEqual(expect.arrayContaining(['react', 'react-dom/client', 'lucide-react']));
  });

  it('carries no animation library; the shell animates with CSS', () => {
    expect(packages.filter(p => /^(motion|framer-motion)(\/|$)/.test(p))).toEqual([]);
  });

  it.each(['data/labs.ts', 'data/changelog.ts', 'data/flashcards.ts', 'data/questions.ts', 'engine/catalog.ts', 'engine/clientCatalog.ts', 'engine/catalogCore.ts', 'engine/mockExam.ts'])(
    'leaves %s to the section that needs it', file => {
      expect(files).not.toContain(file);
    });
});
