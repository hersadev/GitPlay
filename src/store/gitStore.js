import { create } from 'zustand';
import { GitEngine } from '../engine/GitEngine';
import { loadRepo, saveRepo, loadUsedCommands, saveUsedCommands } from '../utils/persistence';
import { COMMAND_INFO } from '../utils/commandInfo';

const engine = new GitEngine();

// Restore persisted repo on startup
const saved = loadRepo();
if (saved) engine.loadState(saved);

const HELP_GENERAL = `GitPlay — comandos soportados en el simulador:

  Básicos:        init, clone, add, commit, status, log, diff
  Ramas:          branch, checkout, switch, merge
  Historia:       restore, reset, revert, stash, tag, cherry-pick, rebase, reflog
  Remoto:         push, pull, fetch
  Terminal:       ls, touch <archivo>, clear

Ayuda específica: git <comando> --help    (p.ej. git commit --help)`;

const HELP_BY_CMD = Object.fromEntries(
  Object.entries(COMMAND_INFO).map(([cmd, { usage, desc }]) => [cmd, `${usage}\n  ${desc}`])
);

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function suggestCommand(typo) {
  if (!typo || typo.length < 2) return null;
  const known = Object.keys(COMMANDS);
  let best = null;
  let bestDist = Infinity;
  for (const c of known) {
    const d = levenshtein(typo, c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  // Sugerir solo si la distancia es ≤2 o si comparten primer carácter y son cortos.
  if (bestDist <= 2) return `git ${best}`;
  return null;
}

const COMMANDS = {
  init:           (e, args) => e.init(),
  add:            (e, args) => e.add(args),
  commit:         (e, args) => e.commit(args),
  status:         (e, args) => e.status(),
  log:            (e, args) => e.log(),
  branch:         (e, args) => e.branch(args),
  checkout:       (e, args) => e.checkout(args),
  switch:         (e, args) => e.switch(args),
  merge:          (e, args) => e.merge(args),
  restore:        (e, args) => e.restore(args),
  reset:          (e, args) => e.gitReset(args),
  revert:         (e, args) => e.revert(args),
  stash:          (e, args) => e.stash(args),
  tag:            (e, args) => e.tag(args),
  'cherry-pick':  (e, args) => e.cherryPick(args),
  rebase:         (e, args) => e.rebase(args),
  reflog:         (e, args) => e.reflog(),
  diff:           (e, args) => e.diff(args),
  push:           (e, args) => e.push(args),
  pull:           (e, args) => e.pull(args),
  fetch:          (e, args) => e.fetch(args),
  clone:          (e, args) => e.clone(args),
};

export const useGitStore = create((set, get) => ({
  repoState: engine.getState(),
  usedCommands: loadUsedCommands(), // { comando: vecesUsado }

  applyCommand(parsed) {
    // git --help, git -h, git help  → ayuda general.
    if (
      parsed.command === '--help' ||
      parsed.command === '-h' ||
      parsed.command === 'help'
    ) {
      const sub = parsed.args[0];
      const result = sub && HELP_BY_CMD[sub]
        ? { ok: true, output: HELP_BY_CMD[sub] }
        : { ok: true, output: HELP_GENERAL };
      return result;
    }

    // git <cmd> --help | -h  → ayuda específica.
    if (parsed.args.includes('--help') || parsed.args.includes('-h')) {
      const help = HELP_BY_CMD[parsed.command];
      return help
        ? { ok: true, output: help }
        : { ok: false, output: `Sin ayuda para '${parsed.command}'.` };
    }

    const handler = COMMANDS[parsed.command];
    let result;
    if (handler) {
      result = handler(engine, parsed.args);
      // Registrar el comando en la libreta de repaso (solo si funcionó).
      if (result.ok) {
        const used = { ...get().usedCommands };
        used[parsed.command] = (used[parsed.command] ?? 0) + 1;
        set({ usedCommands: used });
        saveUsedCommands(used);
      }
    } else {
      const suggestion = suggestCommand(parsed.command);
      const hint = suggestion ? `\n¿Quisiste decir '${suggestion}'?` : '';
      result = { ok: false, output: `git: '${parsed.command}' no es un comando git. Ver 'git --help'.${hint}` };
    }

    const newState = engine.getState();
    set({ repoState: newState });
    saveRepo(engine);
    return result;
  },

  resetRepo() {
    engine.clearState();
    const newState = engine.getState();
    set({ repoState: newState, usedCommands: {} });
    saveRepo(engine);
    saveUsedCommands({});
  },

  createFile(name) {
    const result = engine.createFile(name);
    set({ repoState: engine.getState() });
    saveRepo(engine);
    return result;
  },

  seedFiles(files) {
    engine.seedFiles(files);
    const newState = engine.getState();
    set({ repoState: newState });
    saveRepo(engine);
  },

  // Permite a una lección ejecutar setup arbitrario sobre el engine
  // (sembrar commits remotos, abrir PRs ficticios, etc.).
  runSetup(callback) {
    if (typeof callback !== 'function') return;
    try { callback(engine); } catch {}
    set({ repoState: engine.getState() });
    saveRepo(engine);
  },

  editFile(name, content) {
    engine.editFile(name, content);
    const newState = engine.getState();
    set({ repoState: newState });
    saveRepo(engine);
  },

  openPR(opts) {
    const result = engine.openPullRequest(opts);
    set({ repoState: engine.getState() });
    saveRepo(engine);
    return result;
  },

  mergePR(id) {
    const result = engine.mergePullRequest(id);
    set({ repoState: engine.getState() });
    saveRepo(engine);
    return result;
  },

  closePR(id) {
    const result = engine.closePullRequest(id);
    set({ repoState: engine.getState() });
    saveRepo(engine);
    return result;
  },
}));
