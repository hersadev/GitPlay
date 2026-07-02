const REPO_KEY = 'gitplay:repo';
const LESSON_KEY = 'gitplay:lesson';
const LESSON_MAX_KEY = 'gitplay:lessonMax';
const COMMANDS_KEY = 'gitplay:commands';
const WELCOME_KEY = 'gitplay:welcomed';
const LEGACY_REPO_KEY = 'gitlern:repo';
const LEGACY_LESSON_KEY = 'gitlern:lesson';

// Bumpea la versión cuando cambia el esquema serializado del repo.
const SCHEMA_VERSION = 4;

export function saveRepo(engine) {
  try {
    const commits = [...engine.commits.entries()].map(([h, c]) => [h, {
      ...c,
      tree: c.tree instanceof Map ? [...c.tree.entries()] : [],
    }]);
    localStorage.setItem(REPO_KEY, JSON.stringify({
      _v: SCHEMA_VERSION,
      initialized: engine.initialized,
      commits,
      branches: [...engine.branches.entries()],
      tags: [...engine.tags.entries()],
      HEAD: engine.HEAD,
      stagingArea: [...engine.stagingArea.entries()],
      workingDirectory: [...engine.workingDirectory.entries()],
      stash: engine.stash.map(s => ({
        message: s.message,
        stagingArea: [...s.stagingArea.entries()],
        workingDirectory: [...s.workingDirectory.entries()],
      })),
      reflogHistory: engine.reflogHistory,
      lastCommand: engine.lastCommand,
      mergeState: engine.mergeState
        ? { ...engine.mergeState, conflicts: [...engine.mergeState.conflicts] }
        : null,
      rebaseState: engine.rebaseState
        ? { ...engine.rebaseState, conflicts: [...engine.rebaseState.conflicts] }
        : null,
      remoteBranches: [...engine.remoteBranches.entries()],
      remoteCommits: [...engine.remoteCommits.entries()].map(([h, c]) => [h, {
        ...c,
        tree: c.tree instanceof Map ? [...c.tree.entries()] : [],
      }]),
      remoteRefs: [...engine.remoteRefs.entries()],
      pullRequests: engine.pullRequests,
      prCounter: engine.prCounter,
    }));
  } catch (_) {}
}

export function loadRepo() {
  try {
    let raw = localStorage.getItem(REPO_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_REPO_KEY);
      if (legacy) {
        localStorage.setItem(REPO_KEY, legacy);
        localStorage.removeItem(LEGACY_REPO_KEY);
        raw = legacy;
      }
    }
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Esquema antiguo → descartar para evitar inconsistencias.
    if (d._v !== SCHEMA_VERSION) {
      localStorage.removeItem(REPO_KEY);
      return null;
    }
    return {
      initialized: d.initialized ?? false,
      commits: new Map((d.commits ?? []).map(([h, c]) => [h, {
        ...c,
        tree: new Map(c.tree ?? []),
      }])),
      branches: new Map(d.branches ?? []),
      tags: new Map(d.tags ?? []),
      HEAD: d.HEAD ?? 'main',
      stagingArea: new Map(d.stagingArea ?? []),
      workingDirectory: new Map(d.workingDirectory ?? []),
      stash: (d.stash ?? []).map(s => ({
        message: s.message,
        stagingArea: new Map(s.stagingArea ?? []),
        workingDirectory: new Map(s.workingDirectory ?? []),
      })),
      reflogHistory: d.reflogHistory ?? [],
      lastCommand: d.lastCommand ?? null,
      mergeState: d.mergeState
        ? { ...d.mergeState, conflicts: new Set(d.mergeState.conflicts ?? []) }
        : null,
      rebaseState: d.rebaseState
        ? {
            ...d.rebaseState,
            todo: d.rebaseState.todo ?? [],
            created: d.rebaseState.created ?? [],
            conflicts: new Set(d.rebaseState.conflicts ?? []),
          }
        : null,
      remoteBranches: new Map(d.remoteBranches ?? []),
      remoteCommits: new Map((d.remoteCommits ?? []).map(([h, c]) => [h, {
        ...c,
        tree: new Map(c.tree ?? []),
      }])),
      remoteRefs: new Map(d.remoteRefs ?? []),
      pullRequests: d.pullRequests ?? [],
      prCounter: d.prCounter ?? 0,
    };
  } catch (_) { return null; }
}

export function saveLessonIndex(index) {
  try { localStorage.setItem(LESSON_KEY, String(index)); } catch (_) {}
}

export function loadLessonIndex() {
  try {
    let raw = localStorage.getItem(LESSON_KEY);
    if (raw === null) {
      const legacy = localStorage.getItem(LEGACY_LESSON_KEY);
      if (legacy !== null) {
        localStorage.setItem(LESSON_KEY, legacy);
        localStorage.removeItem(LEGACY_LESSON_KEY);
        raw = legacy;
      }
    }
    return Math.max(0, parseInt(raw ?? '0') || 0);
  } catch (_) { return 0; }
}

// Índice de la lección más avanzada alcanzada (para desbloquear en el selector).
export function saveLessonMax(index) {
  try { localStorage.setItem(LESSON_MAX_KEY, String(index)); } catch (_) {}
}

export function loadLessonMax() {
  try {
    const raw = localStorage.getItem(LESSON_MAX_KEY);
    // Compat: usuarios previos a esta clave desbloquean hasta su lección actual.
    if (raw === null) return loadLessonIndex();
    return Math.max(0, parseInt(raw) || 0);
  } catch (_) { return 0; }
}

// Comandos git ya utilizados: { comando: vecesUsado }.
export function loadUsedCommands() {
  try {
    const raw = localStorage.getItem(COMMANDS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch (_) { return {}; }
}

export function saveUsedCommands(commands) {
  try { localStorage.setItem(COMMANDS_KEY, JSON.stringify(commands)); } catch (_) {}
}

export function clearProgress() {
  try {
    localStorage.removeItem(REPO_KEY);
    localStorage.removeItem(LESSON_KEY);
    localStorage.removeItem(LESSON_MAX_KEY);
    localStorage.removeItem(COMMANDS_KEY);
    localStorage.removeItem(WELCOME_KEY);
    localStorage.removeItem(LEGACY_REPO_KEY);
    localStorage.removeItem(LEGACY_LESSON_KEY);
  } catch (_) {}
}

// Modal de bienvenida: se muestra a usuarios nuevos y tras reiniciar el juego.
export function loadWelcomeSeen() {
  try { return localStorage.getItem(WELCOME_KEY) === '1'; } catch (_) { return true; }
}

export function saveWelcomeSeen() {
  try { localStorage.setItem(WELCOME_KEY, '1'); } catch (_) {}
}

const BADGES_KEY = 'gitplay:badges';
const EXPORT_VERSION = 1;

// Empaqueta todo el progreso (repo, lección y logros) tal cual está en
// localStorage para descargarlo como archivo. El progreso ya se auto-guarda;
// esto permite además hacer copia de seguridad y llevarlo a otro navegador.
export function exportProgress() {
  try {
    return {
      _app: 'gitplay',
      _export: EXPORT_VERSION,
      savedAt: new Date().toISOString(),
      repo: localStorage.getItem(REPO_KEY),
      lesson: localStorage.getItem(LESSON_KEY),
      lessonMax: localStorage.getItem(LESSON_MAX_KEY),
      badges: localStorage.getItem(BADGES_KEY),
      commands: localStorage.getItem(COMMANDS_KEY),
    };
  } catch (_) {
    return null;
  }
}

// Restaura un progreso exportado. Devuelve true si el archivo es válido.
// El llamador debe recargar la app para que el store se reinicialice.
export function importProgress(data) {
  try {
    if (!data || data._app !== 'gitplay') return false;
    if (typeof data.repo === 'string') localStorage.setItem(REPO_KEY, data.repo);
    else localStorage.removeItem(REPO_KEY);
    if (typeof data.lesson === 'string') localStorage.setItem(LESSON_KEY, data.lesson);
    else localStorage.removeItem(LESSON_KEY);
    if (typeof data.lessonMax === 'string') localStorage.setItem(LESSON_MAX_KEY, data.lessonMax);
    else localStorage.removeItem(LESSON_MAX_KEY);
    if (typeof data.badges === 'string') localStorage.setItem(BADGES_KEY, data.badges);
    else localStorage.removeItem(BADGES_KEY);
    if (typeof data.commands === 'string') localStorage.setItem(COMMANDS_KEY, data.commands);
    else localStorage.removeItem(COMMANDS_KEY);
    return true;
  } catch (_) {
    return false;
  }
}
