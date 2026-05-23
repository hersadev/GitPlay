import { useEffect, useRef, useState } from 'react';
import { BADGES, loadEarnedBadges, saveEarnedBadges, clearEarnedBadges } from '../utils/badges';

export function useBadges({ repoState, lessonIndex, totalLessons }) {
  const [earned, setEarned] = useState(() => loadEarnedBadges());
  const [recent, setRecent] = useState(null); // último badge ganado (para toast)
  const recentTimer = useRef(null);

  useEffect(() => {
    const ctx = { repoState, lessonIndex, totalLessons };
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
      // Mostrar el último badge desbloqueado en un toast
      setRecent(newly[newly.length - 1]);
      if (recentTimer.current) clearTimeout(recentTimer.current);
      recentTimer.current = setTimeout(() => setRecent(null), 3500);
    }
  }, [repoState, lessonIndex, totalLessons]);

  function reset() {
    clearEarnedBadges();
    setEarned(new Set());
    setRecent(null);
  }

  return { earned, recent, reset, dismissRecent: () => setRecent(null) };
}
