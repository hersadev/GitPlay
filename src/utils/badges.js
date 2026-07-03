// Definiciones de logros. Cada check recibe { repoState, lessonIndex, totalLessons, history }
// y devuelve true cuando el badge se desbloquea.

import { MODULES, ALL_LESSONS, LEVELS } from '../lessons';

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
    id: 'conflict-survivor',
    name: '¡Houston, tenemos un conflicto!',
    description: 'Encuéntrate tu primer conflicto (merge, pull o rebase). Que no cunda el pánico.',
    icon: '💥',
    check: ({ repoState }) =>
      (repoState.mergeState?.conflicts?.size ?? 0) > 0 ||
      (repoState.rebaseState?.conflicts?.size ?? 0) > 0,
  },
  {
    id: 'conflict-resolver',
    name: 'Pacificador',
    description: 'Resuelve un conflicto de merge.',
    icon: '🕊️',
    check: ({ repoState }) =>
      [...repoState.reflog].some((e) => /Merge resuelto/.test(e.message ?? '')),
  },
  {
    id: 'rebase-surgeon',
    name: 'Cirujano del rebase',
    description: 'Completa un rebase resolviendo sus conflictos (git rebase --continue).',
    icon: '🩹',
    check: ({ repoState }) =>
      [...repoState.reflog].some((e) =>
        /rebase finished.*conflictos resueltos/.test(e.message ?? '')
      ),
  },
  // Hitos por nivel: el umbral es el nº acumulado de lecciones hasta terminar
  // el último módulo del nivel, calculado desde MODULES (se ajusta solo al
  // añadir lecciones o mover módulos de nivel).
  ...LEVELS.map((lvl) => {
    const lastModuleIdx = MODULES.reduce((acc, m, i) => (m.level === lvl.id ? i : acc), -1);
    const threshold = MODULES.slice(0, lastModuleIdx + 1).reduce(
      (n, mod) => n + mod.lessons.length,
      0
    );
    const n = MODULES.filter((m) => m.level === lvl.id).reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    return {
      id: `nivel-${lvl.id}`,
      name: `${lvl.name} completado`,
      description: `Termina las ${n} lecciones del ${lvl.name.toLowerCase()}.`,
      icon: lvl.icon,
      check: ({ lessonIndex }) => lessonIndex >= threshold,
    };
  }),
  {
    id: 'graduate',
    name: 'Graduado',
    // Se otorga al completar todas las lecciones NO opcionales (el puente a
    // Git real es opcional y tiene su propio badge de módulo).
    description: `Completa las ${ALL_LESSONS.filter((l) => !l.optional).length} lecciones del curso.`,
    icon: '🎓',
    check: ({ lessonIndex, isComplete }) => {
      const core = ALL_LESSONS.filter((l) => !l.optional).length;
      return lessonIndex >= core || (isComplete && lessonIndex >= core - 1);
    },
  },
];

export function loadEarnedBadges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    // Descartar ids de badges que ya no existen (p. ej. los antiguos
    // "module-N" tras pasar a hitos por nivel): inflarían el contador.
    const known = new Set(BADGES.map((b) => b.id));
    return new Set(ids.filter((id) => known.has(id)));
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
