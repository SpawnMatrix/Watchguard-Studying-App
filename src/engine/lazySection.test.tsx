import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSection, type SectionLoadEnv } from './lazySection';
import SectionErrorBoundary from '../components/SectionErrorBoundary';

function fakeEnv({ build = '/assets/index-new.js', reloadedFrom = null as string | null, storable = true } = {}) {
  const calls = { reloads: 0, marked: [] as string[] };
  const env: SectionLoadEnv = {
    build: () => build,
    reloadedFrom: () => reloadedFrom,
    markReload: b => { if (storable) calls.marked.push(b); return storable; },
    reload: () => { calls.reloads++; },
  };
  return { env, calls };
}

const settled = async (promise: Promise<unknown>) => {
  let state = 'pending';
  promise.then(() => { state = 'resolved'; }, () => { state = 'rejected'; });
  await new Promise(resolve => setTimeout(resolve, 0));
  return state;
};

const missingFile = () => Promise.reject(new Error('Failed to fetch dynamically imported module'));

describe('loading a section on demand', () => {
  it('passes a successful load straight through', async () => {
    const { env, calls } = fakeEnv();
    await expect(loadSection(async () => 'module', env)).resolves.toBe('module');
    expect(calls.reloads).toBe(0);
  });

  it('reloads once when a deploy has replaced the file, and shows nothing in the meantime', async () => {
    const { env, calls } = fakeEnv({ build: '/assets/index-old.js' });
    expect(await settled(loadSection(missingFile, env))).toBe('pending');
    expect(calls.reloads).toBe(1);
    expect(calls.marked).toEqual(['/assets/index-old.js']);
  });

  it('reports the failure when the reload brought back the same build, however long that took', async () => {
    const { env, calls } = fakeEnv({ build: '/assets/index-old.js', reloadedFrom: '/assets/index-old.js' });
    await expect(loadSection(() => Promise.reject(new Error('offline')), env)).rejects.toThrow('offline');
    expect(calls.reloads).toBe(0);
  });

  it('reloads again when a later deploy replaces the build this tab is now running', async () => {
    const { env, calls } = fakeEnv({ build: '/assets/index-new.js', reloadedFrom: '/assets/index-old.js' });
    expect(await settled(loadSection(missingFile, env))).toBe('pending');
    expect(calls.reloads).toBe(1);
  });

  it('never reloads when the reload cannot be remembered, so it cannot loop', async () => {
    const { env, calls } = fakeEnv({ storable: false });
    await expect(loadSection(missingFile, env)).rejects.toThrow('Failed to fetch');
    expect(calls.reloads).toBe(0);
  });
});

describe('section error boundary', () => {
  it('renders the section normally until something fails', () => {
    expect(renderToStaticMarkup(<SectionErrorBoundary><p>Quiz</p></SectionErrorBoundary>)).toBe('<p>Quiz</p>');
  });

  it('replaces a failed section with a reload prompt instead of blanking the app', () => {
    expect(SectionErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    const boundary = new SectionErrorBoundary({ children: <p>Quiz</p> });
    boundary.state = { failed: true };
    const html = renderToStaticMarkup(<>{boundary.render()}</>);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Reload the page');
    expect(html).not.toContain('Quiz');
  });

  it('wraps every on-demand section in the app', () => {
    const app = readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
    const lazyImports = app.match(/lazy\(\(\) => loadSection\(\(\) => import\(/g) ?? [];
    expect(lazyImports.length).toBe(7);
    expect(app).not.toMatch(/lazy\(\(\) => import\(/);
    expect(app).toMatch(/<SectionErrorBoundary>\s*<Suspense/);
  });
});
