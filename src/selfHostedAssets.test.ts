import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * The portal promises to run offline and to send visitors to no third party. Until 1.22.1,
 * `src/index.css` imported Google Fonts: the production CSP blocked it on every page load, so the
 * intended fonts never rendered, and relaxing `style-src` would have handed Google every visitor's
 * address. These tests keep page assets on our own origin and keep the theme pointing at fonts
 * that are actually bundled.
 */
const root = path.resolve(__dirname, '..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
const require = createRequire(import.meta.url);

const stylesheets = readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' })
  .filter(file => file.endsWith('.css'))
  .map(file => path.join('src', file));
const fontPackages = [...read('src/main.tsx').matchAll(/^import '(@fontsource[^']+)';/gm)].map(m => m[1]);

describe('self-hosted page assets', () => {
  it('loads no stylesheet, font or script from another origin', () => {
    const external = /(?:@import\s+url\(|url\(|href=|src=)\s*['"]?(?:https?:)?\/\//i;
    for (const file of ['index.html', ...stylesheets]) {
      expect(read(file), `${file} references another origin`).not.toMatch(external);
    }
  });

  it('bundles the fonts it imports from relative files only', () => {
    expect(fontPackages.length).toBeGreaterThanOrEqual(3);
    for (const pkg of fontPackages) {
      const css = readFileSync(require.resolve(pkg), 'utf8');
      const sources = [...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]);
      expect(sources.length, pkg).toBeGreaterThan(0);
      for (const src of sources) expect(src, `${pkg} would fetch ${src}`).toMatch(/^\.\//);
    }
  });

  it('names a bundled face first in every theme font stack', () => {
    const declared = new Set(fontPackages.flatMap(pkg =>
      [...readFileSync(require.resolve(pkg), 'utf8').matchAll(/font-family:\s*'([^']+)'/g)].map(m => m[1])));
    const stacks = [...read('src/index.css').matchAll(/--font-(sans|display|mono):\s*"([^"]+)"/g)];
    expect(stacks.map(m => m[1]).sort()).toEqual(['display', 'mono', 'sans']);
    for (const [, role, family] of stacks) expect(declared, `--font-${role} starts with ${family}`).toContain(family);
  });
});
