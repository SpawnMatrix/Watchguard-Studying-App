import { use, type ReactNode } from 'react';
import { useLearningTrack } from '../engine/LearningTrack';
import { ensureCatalog, questionMetaById } from '../engine/catalog';
import { readJSON } from '../account/storage';
import type { Track } from '../engine/types';

const pending = new Map<string, Promise<void>>();
/** Suspend before changing track content, preserving mounted quiz/chat state while it loads. */
export default function CatalogBoundary({ section, children }: { section: string; children: ReactNode }) {
  const { track } = useLearningTrack();
  const tracks = new Set<Track>([track]);
  const saved = section === 'quiz' ? readJSON<{ filters?: { track: Track | 'all' }; mode?: string; current?: { id: number } } | null>('watchguard-quiz-session-v2', null) : null;
  if (saved?.filters?.track === 'all') for (const t of ['local', 'cloud', 'network-plus'] as const) tracks.add(t);
  else if (saved?.filters) tracks.add(saved.filters.track);
  const ids = saved?.mode === 'weakness-review' ? Object.keys(readJSON('weakness_deck', {})).map(Number) : [];
  if (saved?.current) ids.push(saved.current.id);
  for (const id of ids) { const row = questionMetaById.get(id); if (row) tracks.add(row.track ?? 'local'); }
  const key = [...tracks].sort().join(',');
  if (!pending.has(key)) pending.set(key, Promise.all([...tracks].map(t => ensureCatalog(t))).then(() => {}));
  use(pending.get(key)!);
  return children;
}
