import { resetHashCounter, markHashesUsed } from '../utils/hashGenerator.js';
import { seedMethods } from './seeds.js';
import { basicCommands } from './commands/basics.js';
import { diffCommands } from './commands/diff.js';
import { branchingCommands } from './commands/branching.js';
import { mergeCommands } from './commands/merge.js';
import { historyCommands } from './commands/history.js';
import { rebaseCommands } from './commands/rebase.js';
import { remoteCommands } from './commands/remote.js';
import { pullRequestMethods } from './commands/pullRequests.js';

// Núcleo del simulador: estado del repo, persistencia y helpers compartidos.
// Los comandos viven en módulos por tema (engine/commands/* y engine/seeds.js)
// y se montan sobre el prototipo al final de este archivo, así que la API
// pública de GitEngine no cambia: engine.commit(...), engine.merge(...), etc.
export class GitEngine {
  constructor() {
    this._initState();
  }

  _initState() {
    this.initialized = false;
    this.commits = new Map();
    this.branches = new Map();
    this.tags = new Map();
    this.HEAD = 'main';
    // staging y workingDirectory ahora guardan { content } por archivo.
    this.stagingArea = new Map();         // filename -> content
    this.workingDirectory = new Map();    // filename -> content
    // Pila del stash. OJO: no llamarla `this.stash` — taparía el método stash().
    this.stashEntries = [];
    this.reflogHistory = [];
    this.lastCommand = null;
    // Estado de merge en curso (cuando hay conflictos por resolver).
    // { fromBranch, fromHash, conflicts: Set<filename> } | null
    this.mergeState = null;
    // Estado de rebase en curso (pausado en un conflicto).
    // { branch, target, originalTip, newParent, todo: [hash], created: [hash], conflicts: Set<filename> } | null
    this.rebaseState = null;
    // Remoto simulado "origin".
    this.remoteBranches = new Map();      // branchName -> hash (estado real del remoto)
    this.remoteCommits = new Map();       // hash -> commit (todos los commits del remoto)
    this.remoteRefs = new Map();          // 'origin/<branch>' -> hash (lo que el cliente sabe tras fetch)
    this.pullRequests = [];               // [{ id, title, body, from, into, state, commits, author }]
    this.prCounter = 0;
  }

  getState() {
    return {
      initialized: this.initialized,
      commits: new Map(this.commits),
      branches: new Map(this.branches),
      tags: new Map(this.tags),
      HEAD: this.HEAD,
      stagingArea: new Map(this.stagingArea),
      workingDirectory: new Map(this.workingDirectory),
      stash: [...this.stashEntries],
      reflog: [...this.reflogHistory],
      lastCommand: this.lastCommand,
      mergeState: this.mergeState
        ? { ...this.mergeState, conflicts: new Set(this.mergeState.conflicts) }
        : null,
      rebaseState: this.rebaseState
        ? {
            ...this.rebaseState,
            todo: [...this.rebaseState.todo],
            created: [...this.rebaseState.created],
            conflicts: new Set(this.rebaseState.conflicts),
          }
        : null,
      remoteBranches: new Map(this.remoteBranches),
      remoteCommits: new Map(this.remoteCommits),
      remoteRefs: new Map(this.remoteRefs),
      pullRequests: this.pullRequests.map((pr) => ({ ...pr, commits: [...pr.commits] })),
    };
  }

  clearState() {
    resetHashCounter();
    this._initState();
  }

  loadState(data) {
    this.initialized = data.initialized;
    this.commits = data.commits;
    this.branches = data.branches;
    this.tags = data.tags;
    this.HEAD = data.HEAD;
    this.stagingArea = data.stagingArea instanceof Map ? data.stagingArea : new Map();
    this.workingDirectory = data.workingDirectory instanceof Map ? data.workingDirectory : new Map();
    this.stashEntries = data.stash ?? [];
    this.reflogHistory = data.reflogHistory;
    this.lastCommand = data.lastCommand;
    this.mergeState = data.mergeState ?? null;
    this.rebaseState = data.rebaseState ?? null;
    this.remoteBranches = data.remoteBranches instanceof Map ? data.remoteBranches : new Map();
    this.remoteCommits = data.remoteCommits instanceof Map ? data.remoteCommits : new Map();
    this.remoteRefs = data.remoteRefs instanceof Map ? data.remoteRefs : new Map();
    this.pullRequests = Array.isArray(data.pullRequests) ? data.pullRequests : [];
    this.prCounter = data.prCounter ?? this.pullRequests.length;
    markHashesUsed([...this.commits.keys(), ...this.remoteCommits.keys()]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  _notInit() {
    return { ok: false, output: 'fatal: no es un repositorio Git.\nPista: ejecuta primero "git init"' };
  }

  _currentCommitHash() {
    if (this._isDetached()) return this.HEAD;
    return this.branches.get(this.HEAD) ?? null;
  }

  _currentTree() {
    const h = this._currentCommitHash();
    return h ? this._treeOf(h) : new Map();
  }

  _treeOf(hash) {
    const c = this.commits.get(hash);
    return c?.tree instanceof Map ? c.tree : new Map();
  }

  _isDetached() {
    return !this.branches.has(this.HEAD);
  }

  // Recorre AMBOS padres (merges incluidos): un merge commit desciende de las dos ramas.
  _isAncestor(ancestorHash, descendantHash, commitMap = this.commits) {
    if (!ancestorHash) return true;
    const stack = [descendantHash];
    const visited = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || visited.has(cur)) continue;
      if (cur === ancestorHash) return true;
      visited.add(cur);
      const c = commitMap.get(cur);
      if (c) stack.push(c.parent, c.secondParent);
    }
    return false;
  }

  _collectAncestors(hash, commitMap = this.commits) {
    const out = new Set();
    const stack = [hash];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || out.has(cur)) continue;
      out.add(cur);
      const c = commitMap.get(cur);
      if (c) stack.push(c.parent, c.secondParent);
    }
    return out;
  }

  _findCommonAncestor(hashA, hashB, commitMap = this.commits) {
    const ancestorsA = this._collectAncestors(hashA, commitMap);
    // BFS desde B para encontrar el ancestro común más cercano a B.
    const queue = [hashB];
    const visited = new Set();
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || visited.has(cur)) continue;
      if (ancestorsA.has(cur)) return cur;
      visited.add(cur);
      const c = commitMap.get(cur);
      if (c) queue.push(c.parent, c.secondParent);
    }
    return null;
  }

  _resolveRef(ref) {
    if (!ref || ref === 'HEAD') return this._currentCommitHash();
    const match = ref.match(/^HEAD~(\d+)$/);
    if (match) {
      let hash = this._currentCommitHash();
      for (let i = 0; i < parseInt(match[1]); i++) hash = this.commits.get(hash)?.parent ?? null;
      return hash;
    }
    if (this.branches.has(ref)) return this.branches.get(ref);
    if (this.tags.has(ref)) return this.tags.get(ref);
    // Hash completo o abreviado.
    return this._findCommit(ref);
  }

  _findCommit(ref) {
    if (this.commits.has(ref)) return ref;
    for (const hash of this.commits.keys()) { if (hash.startsWith(ref)) return hash; }
    return null;
  }

  _addReflog(ref, hash, message) {
    this.reflogHistory.unshift({ ref, hash, message, timestamp: Date.now() });
  }

  _setLast(command, args) {
    this.lastCommand = { command, args };
  }
}

Object.assign(
  GitEngine.prototype,
  seedMethods,
  basicCommands,
  diffCommands,
  branchingCommands,
  mergeCommands,
  historyCommands,
  rebaseCommands,
  remoteCommands,
  pullRequestMethods,
);
