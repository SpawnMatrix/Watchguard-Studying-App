import { expect, it, vi } from 'vitest';
import { studyQuestions, qaQuestions } from './catalog';

it('starts empty, loads only one track and resolves cross-track weakness IDs on demand', async () => {
  vi.resetModules();
  const client = await import('./clientCatalog');
  expect(client.studyQuestions).toHaveLength(0);
  await Promise.all([client.ensureCatalog('cloud'), client.ensureCatalog('cloud')]);
  expect(client.studyQuestions).toEqual(studyQuestions.filter(q => q.track === 'cloud'));
  const remote = studyQuestions.find(q => q.track === 'network-plus')!;
  expect(client.questionById.has(remote.id)).toBe(false);
  expect(client.questionMetaById.get(remote.id)?.track).toBe('network-plus');
  await client.ensureCatalog('cloud', [remote.id, -999]);
  expect(client.questionById.get(remote.id)).toEqual(remote);
  expect(client.studyQuestions.some(q => (q.track ?? 'local') === 'local')).toBe(false);
  expect(new Set(client.studyQuestions.map(q => q.id)).size).toBe(client.studyQuestions.length);
});

it('round trips the entire canonical bank and Q&A without content or ID changes', async () => {
  vi.resetModules();
  const client = await import('./clientCatalog');
  await client.ensureCatalog('all');
  // Serialization intentionally drops undefined optional properties, not content.
  expect(JSON.parse(JSON.stringify(client.studyQuestions))).toEqual(JSON.parse(JSON.stringify(studyQuestions)));
  expect(JSON.parse(JSON.stringify(client.qaQuestions))).toEqual(JSON.parse(JSON.stringify(qaQuestions)));
  for (const track of ['local', 'cloud', 'network-plus'] as const) {
    expect(client.filterQuestions({ track })).toEqual(client.studyQuestions.filter(q => (q.track ?? 'local') === track));
  }
});
