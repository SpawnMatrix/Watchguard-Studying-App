import { useEffect, useState } from 'react';
import { PROGRESS_EVENT } from '../account/storage';
import type { Track } from '../engine/types';

export default function FlashcardsDue({ track, onOpen }: { track: Track; onOpen: () => void }) {
  const [due, setDue] = useState<{ track: Track; count: number } | null>(null);
  useEffect(() => {
    let active = true;
    const update = () => {
      void import('../engine/flashcardDue').then(({ flashcardsDue }) => {
        if (active) setDue({ track, count: flashcardsDue(track) });
      }).catch(() => { if (active) setDue(null); });
    };
    update();
    const timer = window.setInterval(update, 60_000);
    window.addEventListener(PROGRESS_EVENT, update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(PROGRESS_EVENT, update);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
    };
  }, [track]);
  return <button className="secondary-button" onClick={onOpen}>
    {due?.track === track ? `${due.count} flashcard${due.count === 1 ? '' : 's'} due today` : 'Review flashcards'}
  </button>;
}
