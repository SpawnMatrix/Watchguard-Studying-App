import { afterAll, beforeAll, expect, it } from 'vitest';
import express from 'express';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { productionFiles } from './static';

let server: Server;
let base: string;
const dir = mkdtempSync(path.join(tmpdir(), 'study-static-'));
beforeAll(async () => {
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'index.html'), '<main>Study shell</main>');
  writeFileSync(path.join(dir, 'assets', 'current-123.js'), 'export const current = true;');
  const app = express();
  app.use(productionFiles(dir));
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', () => resolve()); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  rmSync(dir, { recursive: true, force: true });
});
it.each(['/assets/old-hash.js', '/assets/nested/missing.css?cache=1', '/assets/missing.woff2'])('returns a non-cacheable 404 for %s', async url => {
  for (const method of ['GET', 'HEAD']) {
    const response = await fetch(base + url, { method });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('Study shell');
  }
});
it('still serves existing hashed assets with immutable caching', async () => {
  const response = await fetch(base + '/assets/current-123.js');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toContain('immutable');
  expect(await response.text()).toContain('export const current');
});
it.each(['/', '/deep/link/path', '/labs?x=1'])('keeps the SPA fallback at %s', async url => {
  const response = await fetch(base + url);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('Study shell');
});

