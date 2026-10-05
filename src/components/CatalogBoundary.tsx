import { useEffect, useState, type ReactNode } from 'react';
import { useLearningTrack } from '../engine/LearningTrack';
import { ensureCatalog } from '../engine/catalog';
import { readJSON } from '../account/storage';
import type { Track } from '../engine/types';

/** Children mount only after their bank and any saved cross-track quiz are available. */
export default function CatalogBoundary({ section, children }: { section: string; children: ReactNode }) {
  const { track } = useLearningTrack();
  const key = `${section}:${track}`;
  const [ready, setReady] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    const saved = section === 'quiz' ? readJSON<{ filters?: { track: Track | 'all' }; mode?: string; current?: { id: number } } | null>('watchguard-quiz-session-v2', null) : null;
    const ids = saved?.mode === 'weakness-review' ? Object.keys(readJSON('weakness_deck', {})).map(Number) : [];
    if (saved?.current) ids.push(saved.current.id);
    void Promise.all([ensureCatalog(track, ids), saved?.filters ? ensureCatalog(saved.filters.track) : Promise.resolve()])
      .then(() => { if (active) setReady(key); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [key, section, track, attempt]);
  if (ready === key) return children;
  if (failed) return <div role="alert"><p>The questions could not be loaded. Your saved progress is safe.</p><button className="secondary-button" onClick={() => setAttempt(a => a + 1)}>Try again</button></div>;
  return <p className="section-loading" role="status">Loading questions…</p>;
}
