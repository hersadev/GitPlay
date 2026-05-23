// Definiciones de logros. Cada check recibe { repoState, lessonIndex, totalLessons, history }
// y devuelve true cuando el badge se desbloquea.

const STORAGE_KEY = 'gitplay:badges';

export const BADGES = [
  {
    id: 'first-commit',
    name: 'Primeros pasos',
    description: 'Crea tu primer commit.',
    icon: '🌱',
    check: ({ repoState }) => repoState.commits.size >= 1,
  },
  {
    id: 'branchador',
    name: 'Branchador',
    description: 'Crea tu primera rama (además de main).',
    icon: '🌿',
    check: ({ repoState }) => repoState.branches.size >= 2,
  },
  {
    id: 'merger',
    name: 'Sin miedo al merge',
    description: 'Realiza un merge.',
    icon: '🔀',
    check: ({ repoState }) =>
      [...repoState.commits.values()].some((c) => c.secondParent) ||
      [...repoState.reflog].some((e) => e.message?.includes('merge ')),
  },
  {
    id: 'time-traveler',
    name: 'Time traveler',
    description: 'Usa git reset por primera vez.',
    icon: '⏪',
    check: ({ repoState }) =>
      [...repoState.reflog].some((e) => e.message?.startsWith('reset:')),
  },
  {
    id: 'lifesaver',
    name: 'Salvavidas',
    description: 'Consulta el reflog en alguna lección.',
    icon: '🛟',
    check: ({ repoState }) => repoState.lastCommand?.command === 'reflog',
  },
  {
    id: 'cherry-picker',
    name: 'Cherry-picker',
    description: 'Aplica un cherry-pick.',
    icon: '🍒',
    check: ({ repoState }) =>
      [...repoState.reflog].some((e) => e.message?.startsWith('cherry-pick:')),
  },
  {
    id: 'rebaser',
    name: 'Maestro del rebase',
    description: 'Completa un rebase.',
    icon: '🧱',
    check: ({ repoState }) =>
      [...repoState.reflog].some((e) => e.message?.startsWith('rebase ')),
  },
  {
    id: 'tagger',
    name: 'Versionador',
    description: 'Crea tu primera etiqueta.',
    icon: '🏷️',
    check: ({ repoState }) => repoState.tags.size >= 1,
  },
  {
    id: 'stash-master',
    name: 'Equilibrista',
    description: 'Guarda algo en el stash.',
    icon: '🎒',
    check: ({ repoState }) =>
      repoState.stash.length > 0 ||
      [...repoState.reflog].some((e) => e.message?.includes('stash')),
  },
  {
    id: 'pusher',
    name: 'A la nube',
    description: 'Haz tu primer push a origin.',
    icon: '☁️',
    check: ({ repoState }) => (repoState.remoteBranches?.size ?? 0) >= 1,
  },
  {
    id: 'pr-author',
    name: 'Code reviewer',
    description: 'Abre tu primera Pull Request.',
    icon: '🔃',
    check: ({ repoState }) => (repoState.pullRequests ?? []).length >= 1,
  },
  {
    id: 'pr-merger',
    name: 'Ship it!',
    description: 'Mergea un PR en GitHub.',
    icon: '🚀',
    check: ({ repoState }) => (repoState.pullRequests ?? []).some((p) => p.state === 'merged'),
  },
  {
    id: 'conflict-resolver',
    name: 'Pacificador',
    description: 'Resuelve un conflicto de merge.',
    icon: '🕊️',
    check: ({ repoState }) =>
      [...repoState.reflog].some((e) => /Merge resuelto/.test(e.message ?? '')),
  },
  // Hitos por módulo (orden nuevo)
  {
    id: 'module-1',
    name: 'Módulo 1 completado',
    description: 'Termina "Arrancar TaskFlow" (6 lecciones).',
    icon: '1️⃣',
    check: ({ lessonIndex }) => lessonIndex >= 6,
  },
  {
    id: 'module-2',
    name: 'Módulo 2 completado',
    description: 'Termina "Features en ramas" (7 lecciones).',
    icon: '2️⃣',
    check: ({ lessonIndex }) => lessonIndex >= 13,
  },
  {
    id: 'module-3',
    name: 'Módulo 3 completado',
    description: 'Termina "Trabajar con GitHub" (7 lecciones).',
    icon: '3️⃣',
    check: ({ lessonIndex }) => lessonIndex >= 20,
  },
  {
    id: 'module-4',
    name: 'Módulo 4 completado',
    description: 'Termina "Reescribir historia y releases" (8 lecciones).',
    icon: '4️⃣',
    check: ({ lessonIndex }) => lessonIndex >= 28,
  },
  {
    id: 'module-5',
    name: 'Módulo 5 completado',
    description: 'Termina "Trabajo en equipo avanzado" (6 lecciones).',
    icon: '5️⃣',
    check: ({ lessonIndex }) => lessonIndex >= 34,
  },
  {
    id: 'graduate',
    name: 'Graduado',
    description: 'Completa las 39 lecciones de GitPlay.',
    icon: '🎓',
    check: ({ lessonIndex, totalLessons }) => lessonIndex >= totalLessons,
  },
];

export function loadEarnedBadges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function saveEarnedBadges(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {}
}

export function clearEarnedBadges() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
