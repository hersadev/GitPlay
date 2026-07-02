import { useEffect, useState } from 'react';
import { BADGES, loadEarnedBadges, saveEarnedBadges, clearEarnedBadges } from '../utils/badges';

export function useBadges({ repoState, lessonIndex, totalLessons, isComplete }) {
  const [earned, setEarned] = useState(() => loadEarnedBadges());
  const [queue, setQueue] = useState([]); // logros recién ganados pendientes de anunciar

  useEffect(() => {
    const ctx = { repoState, lessonIndex, totalLessons, isComplete };
    const newly = [];
    const next = new Set(earned);
    for (const b of BADGES) {
      if (next.has(b.id)) continue;
      try {
        if (b.check(ctx)) {
          next.add(b.id);
          newly.push(b);
        }
      } catch {
        // un check defectuoso no debe romper la app
      }
    }
    if (newly.length) {
      setEarned(next);
      saveEarnedBadges(next);
      // Encolar los logros desbloqueados para anunciarlos uno a uno en el modal
      setQueue((q) => [...q, ...newly]);
    }
  }, [repoState, lessonIndex, totalLessons, isComplete]);

  function reset() {
    clearEarnedBadges();
    setEarned(new Set());
    setQueue([]);
  }

  return {
    earned,
    recent: queue[0] ?? null, // logro que se está anunciando ahora
    reset,
    dismissRecent: () => setQueue((q) => q.slice(1)),
  };
}
