import { generateHash, resetHashCounter, setHashCounter } from '../utils/hashGenerator.js';

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
    this.stagingArea = [];
    this.workingDirectory = new Map();
    this.stash = [];
    this.reflogHistory = [];
    this.lastCommand = null;
  }

  getState() {
    return {
      initialized: this.initialized,
      commits: new Map(this.commits),
      branches: new Map(this.branches),
      tags: new Map(this.tags),
      HEAD: this.HEAD,
      stagingArea: [...this.stagingArea],
      workingDirectory: new Map(this.workingDirectory),
      stash: [...this.stash],
      reflog: [...this.reflogHistory],
      lastCommand: this.lastCommand,
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
    this.stagingArea = data.stagingArea;
    this.workingDirectory = data.workingDirectory;
    this.stash = data.stash;
    this.reflogHistory = data.reflogHistory;
    this.lastCommand = data.lastCommand;
    // Sync hash counter so new commits don't collide with existing hashes
    const maxHash = Math.max(0, ...[...this.commits.keys()].map(h => parseInt(h, 16)));
    setHashCounter(maxHash);
  }

  // ── Comandos básicos ──────────────────────────────────────────────────

  init() {
    this._setLast('init', []);
    if (this.initialized) return { ok: true, output: 'Repositorio Git ya inicializado en .git/' };
    this.initialized = true;
    this.branches.set('main', null);
    this.HEAD = 'main';
    this._addReflog('HEAD', null, 'git init');
    return { ok: true, output: 'Repositorio Git vacío inicializado en .git/' };
  }

  add(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git add <archivo>\n       git add .' };
    this._setLast('add', args);

    const target = args[0];
    if (target === '.') {
      const files = [...this.workingDirectory.keys()];
      if (!files.length && !this.stagingArea.length) return { ok: false, output: 'No hay cambios para añadir.' };
      files.forEach((f) => { if (!this.stagingArea.includes(f)) this.stagingArea.push(f); this.workingDirectory.delete(f); });
      return { ok: true, output: '' };
    }
    if (!this.stagingArea.includes(target)) {
      this.stagingArea.push(target);
      this.workingDirectory.delete(target);
    }
    return { ok: true, output: '' };
  }

  commit(args) {
    if (!this.initialized) return this._notInit();
    const mIdx = args.indexOf('-m');
    if (mIdx === -1 || args[mIdx + 1] === undefined) return { ok: false, output: 'Uso: git commit -m "mensaje"' };
    if (!this.stagingArea.length) return { ok: false, output: `En la rama ${this.HEAD}\nNada que hacer commit, el árbol de trabajo está limpio` };

    const message = args.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '');
    const parentHash = this._currentCommitHash();
    const hash = generateHash();

    this.commits.set(hash, { hash, message, parent: parentHash, secondParent: null, timestamp: Date.now(), author: 'Tú', files: [...this.stagingArea] });

    if (this._isDetached()) this.HEAD = hash;
    else this.branches.set(this.HEAD, hash);

    this._addReflog(this.HEAD, hash, `commit: ${message}`);
    this.stagingArea = [];
    this._setLast('commit', args);
    return { ok: true, output: `[${this.HEAD} ${hash}] ${message}\n${this.commits.get(hash).files.length} archivo(s) cambiado(s)` };
  }

  status() {
    if (!this.initialized) return this._notInit();
    this._setLast('status', []);
    const branchLine = this._isDetached() ? `HEAD desacoplado en ${this.HEAD}` : `En la rama ${this.HEAD}`;
    const lines = [branchLine];
    if (!this._currentCommitHash()) lines.push('\nNo hay commits todavía');
    if (this.stagingArea.length) { lines.push('\nCambios para hacer commit:'); this.stagingArea.forEach(f => lines.push(`  nuevo archivo:   ${f}`)); }
    if (this.workingDirectory.size) { lines.push('\nCambios no preparados:'); this.workingDirectory.forEach((s, f) => lines.push(`  ${s}:   ${f}`)); }
    if (!this.stagingArea.length && !this.workingDirectory.size) lines.push('\nNada que hacer commit, el árbol de trabajo está limpio');
    return { ok: true, output: lines.join('\n') };
  }

  log() {
    if (!this.initialized) return this._notInit();
    this._setLast('log', []);
    const startHash = this._currentCommitHash();
    if (!startHash) return { ok: false, output: 'No hay commits todavía.' };

    const lines = [];
    let current = startHash;
    while (current) {
      const c = this.commits.get(current);
      if (!c) break;
      const date = new Date(c.timestamp).toLocaleString('es-ES');
      const refs = [];
      this.branches.forEach((h, name) => { if (h === current) refs.push(name === this.HEAD ? `HEAD -> ${name}` : name); });
      this.tags.forEach((h, name) => { if (h === current) refs.push(`etiqueta: ${name}`); });
      const deco = refs.length ? ` (${refs.join(', ')})` : '';
      lines.push(`commit ${current}${deco}`, `Autor: ${c.author}`, `Fecha: ${date}`, `\n    ${c.message}\n`);
      current = c.parent;
    }
    return { ok: true, output: lines.join('\n') };
  }

  // ── Ramas ─────────────────────────────────────────────────────────────

  branch(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('branch', args);

    if (!args.length || args[0] === '-a') {
      if (!this.branches.size) return { ok: true, output: '' };
      return { ok: true, output: [...this.branches.keys()].map(n => n === this.HEAD ? `* ${n}` : `  ${n}`).join('\n') };
    }
    if (args[0] === '-d' || args[0] === '-D') {
      const name = args[1];
      if (!name) return { ok: false, output: 'Uso: git branch -d <rama>' };
      if (name === this.HEAD) return { ok: false, output: `error: no se puede borrar la rama '${name}' en la que estás.` };
      if (!this.branches.has(name)) return { ok: false, output: `error: la rama '${name}' no existe.` };
      this.branches.delete(name);
      return { ok: true, output: `Eliminada la rama ${name}.` };
    }
    const name = args[0];
    if (this.branches.has(name)) return { ok: false, output: `error: la rama '${name}' ya existe.` };
    this.branches.set(name, this._currentCommitHash());
    return { ok: true, output: '' };
  }

  checkout(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git checkout <rama>' };
    this._setLast('checkout', args);
    if (args[0] === '-b') {
      const name = args[1];
      if (!name) return { ok: false, output: 'Uso: git checkout -b <rama>' };
      const r = this.branch([name]);
      if (!r.ok) return r;
      return this._switchTo(name);
    }
    return this._switchTo(args[0]);
  }

  switch(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git switch <rama>' };
    this._setLast('switch', args);
    if (args[0] === '-c') {
      const name = args[1];
      if (!name) return { ok: false, output: 'Uso: git switch -c <rama>' };
      const r = this.branch([name]);
      if (!r.ok) return r;
      return this._switchTo(name);
    }
    return this._switchTo(args[0]);
  }

  merge(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git merge <rama>' };
    this._setLast('merge', args);

    const target = args[0];
    if (!this.branches.has(target)) return { ok: false, output: `error: la rama '${target}' no existe.` };
    if (target === this.HEAD) return { ok: false, output: 'Ya estás en esa rama.' };

    const currentHash = this._currentCommitHash();
    const targetHash = this.branches.get(target);
    if (!targetHash) return { ok: false, output: `La rama '${target}' no tiene commits.` };
    if (currentHash === targetHash) return { ok: true, output: 'Ya está actualizado.' };

    if (this._isAncestor(currentHash, targetHash)) {
      this.branches.set(this.HEAD, targetHash);
      this._addReflog(this.HEAD, targetHash, `merge ${target}: Fast-forward`);
      return { ok: true, output: `Avance rápido (Fast-forward)\n${currentHash ?? '(inicio)'} → ${targetHash}` };
    }

    const hash = generateHash();
    this.commits.set(hash, { hash, message: `Merge branch '${target}'`, parent: currentHash, secondParent: targetHash, timestamp: Date.now(), author: 'Tú', files: [] });
    this.branches.set(this.HEAD, hash);
    this._addReflog(this.HEAD, hash, `merge ${target}: Merge realizado`);
    return { ok: true, output: `Merge realizado (estrategia 'ort').\ncommit de merge: ${hash}` };
  }

  // ── Historia ──────────────────────────────────────────────────────────

  gitReset(args) {
    if (!this.initialized) return this._notInit();

    let mode = '--mixed';
    let rest = [...args];
    if (rest[0] === '--soft' || rest[0] === '--mixed' || rest[0] === '--hard') {
      mode = rest.shift();
    }
    const refArg = rest[0] ?? 'HEAD';
    this._setLast('reset', [mode, refArg]);

    const targetHash = this._resolveRef(refArg);
    if (targetHash === undefined) return { ok: false, output: `fatal: referencia ambigua '${refArg}'` };

    if (this._isDetached()) this.HEAD = targetHash;
    else this.branches.set(this.HEAD, targetHash);

    if (mode === '--mixed' || mode === '--hard') this.stagingArea = [];
    if (mode === '--hard') this.workingDirectory.clear();

    this._addReflog(this.HEAD, targetHash, `reset: moving to ${refArg}`);
    const modeLabel = { '--soft': 'soft', '--mixed': 'mixed', '--hard': 'hard' }[mode];
    return { ok: true, output: `HEAD apunta ahora a ${targetHash ?? '(inicio)'} (modo ${modeLabel})` };
  }

  revert(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git revert <hash>' };
    this._setLast('revert', args);

    const target = this._findCommit(args[0]);
    if (!target) return { ok: false, output: `error: no existe el commit '${args[0]}'.` };

    const original = this.commits.get(target);
    const hash = generateHash();
    this.commits.set(hash, { hash, message: `Revert "${original.message}"`, parent: this._currentCommitHash(), secondParent: null, timestamp: Date.now(), author: 'Tú', files: [] });

    if (this._isDetached()) this.HEAD = hash;
    else this.branches.set(this.HEAD, hash);

    this._addReflog(this.HEAD, hash, `revert: Revert "${original.message}"`);
    return { ok: true, output: `[${this.HEAD} ${hash}] Revert "${original.message}"\n1 archivo(s) cambiado(s)` };
  }

  stash(args) {
    if (!this.initialized) return this._notInit();
    const sub = args[0] ?? 'push';
    this._setLast('stash', args.length ? args : ['push']);

    if (sub === 'push' || sub === 'save') {
      if (!this.stagingArea.length && !this.workingDirectory.size) return { ok: false, output: 'No hay cambios locales para guardar en el stash.' };
      this.stash.unshift({ stagingArea: [...this.stagingArea], workingDirectory: new Map(this.workingDirectory), message: `WIP on ${this.HEAD}: ${this._currentCommitHash() ?? 'empty'}` });
      this.stagingArea = [];
      this.workingDirectory.clear();
      return { ok: true, output: `Guardado el estado de trabajo en stash@{0}` };
    }
    if (sub === 'pop') {
      if (!this.stash.length) return { ok: false, output: 'No hay entradas en el stash.' };
      const entry = this.stash.shift();
      this.stagingArea = entry.stagingArea;
      entry.workingDirectory.forEach((v, k) => this.workingDirectory.set(k, v));
      return { ok: true, output: 'Cambios restaurados del stash.' };
    }
    if (sub === 'list') {
      if (!this.stash.length) return { ok: true, output: '(stash vacío)' };
      return { ok: true, output: this.stash.map((e, i) => `stash@{${i}}: ${e.message}`).join('\n') };
    }
    if (sub === 'drop') {
      if (!this.stash.length) return { ok: false, output: 'No hay entradas en el stash.' };
      this.stash.shift();
      return { ok: true, output: 'Eliminada stash@{0}' };
    }
    return { ok: false, output: `error: subcomando desconocido '${sub}'` };
  }

  tag(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('tag', args);

    if (!args.length) {
      if (!this.tags.size) return { ok: true, output: '(sin etiquetas)' };
      return { ok: true, output: [...this.tags.keys()].join('\n') };
    }
    if (args[0] === '-d') {
      const name = args[1];
      if (!this.tags.has(name)) return { ok: false, output: `error: la etiqueta '${name}' no existe.` };
      this.tags.delete(name);
      return { ok: true, output: `Eliminada la etiqueta '${name}'` };
    }
    const name = args[0];
    const targetHash = args[1] ? this._resolveRef(args[1]) : this._currentCommitHash();
    if (!targetHash) return { ok: false, output: 'No hay commits para etiquetar.' };
    this.tags.set(name, targetHash);
    return { ok: true, output: '' };
  }

  cherryPick(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git cherry-pick <hash>' };
    this._setLast('cherry-pick', args);

    const target = this._findCommit(args[0]);
    if (!target) return { ok: false, output: `error: no existe el commit '${args[0]}'.` };

    const original = this.commits.get(target);
    const hash = generateHash();
    this.commits.set(hash, { hash, message: original.message, parent: this._currentCommitHash(), secondParent: null, timestamp: Date.now(), author: 'Tú', files: [...original.files] });

    if (this._isDetached()) this.HEAD = hash;
    else this.branches.set(this.HEAD, hash);

    this._addReflog(this.HEAD, hash, `cherry-pick: ${original.message}`);
    return { ok: true, output: `[${this.HEAD} ${hash}] ${original.message}` };
  }

  rebase(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git rebase <rama>' };
    this._setLast('rebase', args);

    const target = args[0];
    const targetHash = this.branches.get(target) ?? this._resolveRef(target);
    if (!targetHash) return { ok: false, output: `error: la rama '${target}' no existe.` };
    if (target === this.HEAD) return { ok: false, output: 'No puedes hacer rebase sobre tu propia rama.' };

    const currentHash = this._currentCommitHash();
    const ancestor = this._findCommonAncestor(currentHash, targetHash);

    const toReapply = [];
    let h = currentHash;
    while (h && h !== ancestor) {
      const c = this.commits.get(h);
      if (!c) break;
      toReapply.unshift(c);
      h = c.parent;
    }

    if (!toReapply.length) return { ok: true, output: 'Ya está actualizado.' };

    let newParent = targetHash;
    for (const c of toReapply) {
      const newHash = generateHash();
      this.commits.set(newHash, { hash: newHash, message: c.message, parent: newParent, secondParent: null, timestamp: Date.now(), author: c.author, files: [...c.files] });
      newParent = newHash;
    }

    this.branches.set(this.HEAD, newParent);
    this._addReflog(this.HEAD, newParent, `rebase finished: HEAD is now at ${newParent}`);
    return { ok: true, output: `Se han reaplicado ${toReapply.length} commit(s) sobre ${target}.\nHEAD apunta a ${newParent}.` };
  }

  reflog() {
    if (!this.initialized) return this._notInit();
    this._setLast('reflog', []);
    if (!this.reflogHistory.length) return { ok: true, output: '(historial vacío)' };
    return { ok: true, output: this.reflogHistory.map((e, i) => `${(e.hash ?? '0000000').padEnd(7)} HEAD@{${i}}: ${e.message}`).join('\n') };
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  _notInit() {
    return { ok: false, output: 'fatal: no es un repositorio Git.\nPista: ejecuta primero "git init"' };
  }

  _currentCommitHash() {
    if (this._isDetached()) return this.HEAD;
    return this.branches.get(this.HEAD) ?? null;
  }

  _isDetached() {
    return !this.branches.has(this.HEAD);
  }

  _switchTo(target) {
    const prev = this.HEAD;
    if (this.branches.has(target)) {
      this.HEAD = target;
      this._addReflog('HEAD', this.branches.get(target), `checkout: moverse de ${prev} a ${target}`);
      return { ok: true, output: `Cambiado a rama '${target}'` };
    }
    if (this.commits.has(target)) {
      this.HEAD = target;
      this._addReflog('HEAD', target, `checkout: moverse a ${target} (HEAD desacoplado)`);
      return { ok: true, output: `HEAD desacoplado en ${target}` };
    }
    return { ok: false, output: `error: pathspec '${target}' no coincide con ningún archivo o rama conocida.` };
  }

  _isAncestor(ancestorHash, descendantHash) {
    if (!ancestorHash) return true;
    let current = descendantHash;
    const visited = new Set();
    while (current && !visited.has(current)) {
      if (current === ancestorHash) return true;
      visited.add(current);
      current = this.commits.get(current)?.parent ?? null;
    }
    return false;
  }

  _findCommonAncestor(hashA, hashB) {
    const ancestorsA = new Set();
    let cur = hashA;
    while (cur) { ancestorsA.add(cur); cur = this.commits.get(cur)?.parent ?? null; }
    cur = hashB;
    while (cur) { if (ancestorsA.has(cur)) return cur; cur = this.commits.get(cur)?.parent ?? null; }
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
    if (this.commits.has(ref)) return ref;
    return null;
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
