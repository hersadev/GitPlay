const REPO_KEY = 'gitplay:repo';
const LESSON_KEY = 'gitplay:lesson';
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

export function clearProgress() {
  try {
    localStorage.removeItem(REPO_KEY);
    localStorage.removeItem(LESSON_KEY);
    localStorage.removeItem(LEGACY_REPO_KEY);
    localStorage.removeItem(LEGACY_LESSON_KEY);
  } catch (_) {}
}
