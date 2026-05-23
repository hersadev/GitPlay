const REPO_KEY = 'gitplay:repo';
const LESSON_KEY = 'gitplay:lesson';
const LEGACY_REPO_KEY = 'gitlern:repo';
const LEGACY_LESSON_KEY = 'gitlern:lesson';

export function saveRepo(engine) {
  try {
    localStorage.setItem(REPO_KEY, JSON.stringify({
      initialized: engine.initialized,
      commits: [...engine.commits.entries()],
      branches: [...engine.branches.entries()],
      tags: [...engine.tags.entries()],
      HEAD: engine.HEAD,
      stagingArea: engine.stagingArea,
      workingDirectory: [...engine.workingDirectory.entries()],
      stash: engine.stash.map(s => ({
        message: s.message,
        stagingArea: s.stagingArea,
        workingDirectory: [...s.workingDirectory.entries()],
      })),
      reflogHistory: engine.reflogHistory,
      lastCommand: engine.lastCommand,
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
    return {
      initialized: d.initialized ?? false,
      commits: new Map(d.commits ?? []),
      branches: new Map(d.branches ?? []),
      tags: new Map(d.tags ?? []),
      HEAD: d.HEAD ?? 'main',
      stagingArea: d.stagingArea ?? [],
      workingDirectory: new Map(d.workingDirectory ?? []),
      stash: (d.stash ?? []).map(s => ({
        message: s.message,
        stagingArea: s.stagingArea ?? [],
        workingDirectory: new Map(s.workingDirectory ?? []),
      })),
      reflogHistory: d.reflogHistory ?? [],
      lastCommand: d.lastCommand ?? null,
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
