import { generateHash, resetHashCounter, markHashesUsed } from '../utils/hashGenerator.js';
import { parseIgnoreRules, matchesIgnore } from '../utils/ignore.js';

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
    this.stash = [];
    this.reflogHistory = [];
    this.lastCommand = null;
    // Estado de merge en curso (cuando hay conflictos por resolver).
    // { fromBranch, fromHash, conflicts: Set<filename> } | null
    this.mergeState = null;
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
      stash: [...this.stash],
      reflog: [...this.reflogHistory],
      lastCommand: this.lastCommand,
      mergeState: this.mergeState
        ? { ...this.mergeState, conflicts: new Set(this.mergeState.conflicts) }
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
    this.stash = data.stash;
    this.reflogHistory = data.reflogHistory;
    this.lastCommand = data.lastCommand;
    this.mergeState = data.mergeState ?? null;
    this.remoteBranches = data.remoteBranches instanceof Map ? data.remoteBranches : new Map();
    this.remoteCommits = data.remoteCommits instanceof Map ? data.remoteCommits : new Map();
    this.remoteRefs = data.remoteRefs instanceof Map ? data.remoteRefs : new Map();
    this.pullRequests = Array.isArray(data.pullRequests) ? data.pullRequests : [];
    this.prCounter = data.prCounter ?? this.pullRequests.length;
    markHashesUsed([...this.commits.keys(), ...this.remoteCommits.keys()]);
  }

  // ── API pública para lecciones ────────────────────────────────────────

  // Carga archivos en el working directory (idempotente):
  // solo añade los que aún no están en staging ni en el árbol del commit actual.
  seedFiles(files) {
    if (!files) return;
    const currentTree = this._currentTree();
    for (const [name, content] of Object.entries(files)) {
      if (this.stagingArea.has(name)) continue;
      if (currentTree.has(name)) continue;
      if (this.workingDirectory.has(name)) continue;
      this.workingDirectory.set(name, content);
    }
  }

  // Permite a una lección (o al editor de archivos) modificar un archivo:
  // si está en staging o en el árbol, lo "modifica" trayéndolo al working dir.
  editFile(name, content) {
    const tree = this._currentTree();
    const base = this.stagingArea.get(name) ?? tree.get(name);
    if (content === base) {
      // Igual que la versión guardada: ya no hay cambios locales pendientes.
      // (Importante al resolver conflictos eligiendo exactamente "nuestra" versión.)
      this.workingDirectory.delete(name);
      return;
    }
    this.workingDirectory.set(name, content);
  }

  // Simula que "otro dev" pusheó un commit a origin sin que el local lo sepa.
  // Idempotente: si ya existe un commit del remoto con el mismo mensaje en esa rama, no hace nada.
  seedRemoteCommit(branch, { message, files, author = 'compañero' }) {
    if (!this.remoteBranches.has(branch)) {
      // Si el remoto aún no tiene la rama, no podemos sembrar (necesita push previo).
      return;
    }
    const parentHash = this.remoteBranches.get(branch);
    // Idempotencia: si el último commit del remoto ya tiene este mensaje, salir.
    if (parentHash) {
      const last = this.remoteCommits.get(parentHash);
      if (last && last.message === message) return;
    }
    const hash = generateHash();
    const parentTree = parentHash ? this.remoteCommits.get(parentHash)?.tree ?? new Map() : new Map();
    const newTree = new Map(parentTree);
    const changedFiles = [];
    for (const [name, content] of Object.entries(files)) {
      newTree.set(name, content);
      changedFiles.push(name);
    }
    this.remoteCommits.set(hash, {
      hash, message,
      parent: parentHash, secondParent: null,
      timestamp: Date.now(), author,
      files: changedFiles, tree: newTree,
    });
    this.remoteBranches.set(branch, hash);
    // NO actualizamos remoteRefs: el cliente todavía no lo sabe hasta que haga fetch.
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

    // git add .  → añade todo el working directory (menos lo ignorado).
    if (args.includes('.')) {
      const files = [...this.workingDirectory.keys()].filter((f) => !this._isIgnored(f));
      files.forEach((f) => {
        this.stagingArea.set(f, this.workingDirectory.get(f));
        this.workingDirectory.delete(f);
      });
      // Conflictos resueltos dejando la versión de HEAD tal cual: marcarlos también.
      if (this.mergeState) {
        const tree = this._currentTree();
        for (const f of this.mergeState.conflicts) {
          if (!this.stagingArea.has(f)) this.stagingArea.set(f, tree.get(f) ?? '');
        }
      }
      return { ok: true, output: '' };
    }

    // Validar primero: si algún archivo no existe, no se añade nada (como git real).
    const tree = this._currentTree();
    const unknown = args.filter(
      (t) => !this.workingDirectory.has(t) && !this.stagingArea.has(t) && !tree.has(t)
    );
    if (unknown.length) {
      return {
        ok: false,
        output: unknown
          .map((t) => `fatal: ruta '${t}' no coincidió con ningún archivo`)
          .concat('Pista: mira los archivos disponibles con `ls` o en el panel derecho.')
          .join('\n'),
      };
    }

    // Archivos ignorados por .gitignore: Git se niega a añadirlos.
    const ignored = args.filter((t) => this._isIgnored(t));
    if (ignored.length) {
      return {
        ok: false,
        output:
          `Las siguientes rutas están ignoradas por tu archivo .gitignore:\n` +
          ignored.map((f) => `  ${f}`).join('\n') +
          `\nPista: para eso existe .gitignore — estos archivos no deben commitearse.`,
      };
    }

    // git add <a> <b> <c>  → procesa cada uno.
    for (const target of args) {
      if (this.workingDirectory.has(target)) {
        this.stagingArea.set(target, this.workingDirectory.get(target));
        this.workingDirectory.delete(target);
      } else if (this.mergeState?.conflicts?.has(target) && !this.stagingArea.has(target)) {
        // Conflicto resuelto dejando la versión de HEAD: marcarlo como resuelto.
        this.stagingArea.set(target, tree.get(target) ?? '');
      }
      // Ya en staging o sin cambios respecto al commit: no-op, como git real.
    }
    return { ok: true, output: '' };
  }

  // Crea un archivo en el working directory (comando `touch` del terminal).
  createFile(name) {
    if (
      this.workingDirectory.has(name) ||
      this.stagingArea.has(name) ||
      this._currentTree().has(name)
    ) {
      return { ok: true, output: '' };
    }
    this.workingDirectory.set(name, '');
    return { ok: true, output: '' };
  }

  commit(args) {
    if (!this.initialized) return this._notInit();
    if (args.includes('--amend')) return this._commitAmend(args);
    const mIdx = args.indexOf('-m');
    // Al concluir un merge se permite `git commit` sin -m: Git usa el mensaje por defecto.
    if ((mIdx === -1 || args[mIdx + 1] === undefined) && !this.mergeState) {
      return { ok: false, output: 'Uso: git commit -m "mensaje"\n       git commit --amend -m "mensaje"' };
    }

    // Si estamos en medio de un merge, exigir que todos los conflictos estén resueltos.
    if (this.mergeState) {
      const unresolved = [...this.mergeState.conflicts].filter(
        (f) => !this.stagingArea.has(f) || hasConflictMarkers(this.stagingArea.get(f))
      );
      if (unresolved.length > 0) {
        return {
          ok: false,
          output: `Conflictos sin resolver en:\n${unresolved.map((f) => '  ' + f).join('\n')}\nEdita los archivos, quita los marcadores, y haz \`git add\` antes de commitear.`,
        };
      }
    }

    if (this.stagingArea.size === 0) {
      return { ok: false, output: `En la rama ${this.HEAD}\nNada que hacer commit, el árbol de trabajo está limpio` };
    }

    const message = mIdx === -1
      ? ''
      : args.slice(mIdx + 1).join(' ').replace(/^["']|["']$/g, '');
    const parentHash = this._currentCommitHash();
    const hash = generateHash();

    const parentTree = parentHash ? this._treeOf(parentHash) : new Map();
    const newTree = new Map(parentTree);
    const changedFiles = [];
    for (const [name, content] of this.stagingArea.entries()) {
      newTree.set(name, content);
      changedFiles.push(name);
    }

    const secondParent = this.mergeState ? this.mergeState.fromHash : null;
    const finalMessage = this.mergeState
      ? (message || `Merge branch '${this.mergeState.fromBranch}'`)
      : message;

    this.commits.set(hash, {
      hash,
      message: finalMessage,
      parent: parentHash,
      secondParent,
      timestamp: Date.now(),
      author: 'Tú',
      files: changedFiles,
      tree: newTree,
    });

    if (this._isDetached()) this.HEAD = hash;
    else this.branches.set(this.HEAD, hash);

    const reflogMsg = this.mergeState
      ? `merge ${this.mergeState.fromBranch}: Merge resuelto (${hash})`
      : `commit: ${finalMessage}`;
    this._addReflog(this.HEAD, hash, reflogMsg);
    this.stagingArea = new Map();
    this.mergeState = null;
    this._setLast('commit', args);
    return { ok: true, output: `[${this.HEAD} ${hash}] ${finalMessage}\n${changedFiles.length} archivo(s) cambiado(s)` };
  }

  // git commit --amend [-m "mensaje"]: reemplaza el último commit.
  // Mismo padre, árbol = árbol anterior + staging; sin -m conserva el mensaje.
  _commitAmend(args) {
    if (this.mergeState) {
      return { ok: false, output: 'fatal: no puedes hacer --amend en medio de un merge.' };
    }
    const oldHash = this._currentCommitHash();
    if (!oldHash) return { ok: false, output: 'No hay ningún commit que enmendar todavía.' };
    const old = this.commits.get(oldHash);

    const mIdx = args.indexOf('-m');
    const message = mIdx !== -1 && args[mIdx + 1] !== undefined
      ? args.slice(mIdx + 1).filter((a) => a !== '--amend').join(' ').replace(/^["']|["']$/g, '')
      : old.message;

    const newTree = new Map(old.tree instanceof Map ? old.tree : new Map());
    const changed = new Set(old.files ?? []);
    for (const [name, content] of this.stagingArea.entries()) {
      newTree.set(name, content);
      changed.add(name);
    }

    const hash = generateHash();
    this.commits.set(hash, {
      hash,
      message,
      parent: old.parent,
      secondParent: old.secondParent ?? null,
      timestamp: Date.now(),
      author: 'Tú',
      files: [...changed],
      tree: newTree,
    });

    if (this._isDetached()) this.HEAD = hash;
    else this.branches.set(this.HEAD, hash);

    this.stagingArea = new Map();
    // El commit antiguo queda huérfano (recuperable vía reflog), como en Git real.
    this._addReflog(this.HEAD, hash, `commit (amend): ${message}`);
    this._setLast('commit', args);
    return {
      ok: true,
      output: `[${this.HEAD} ${hash}] ${message}\nEl commit ${oldHash} fue reemplazado (el hash cambió).`,
    };
  }

  status() {
    if (!this.initialized) return this._notInit();
    this._setLast('status', []);
    const branchLine = this._isDetached() ? `HEAD desacoplado en ${this.HEAD}` : `En la rama ${this.HEAD}`;
    const lines = [branchLine];
    if (!this._currentCommitHash()) lines.push('\nNo hay commits todavía');

    if (this.mergeState) {
      lines.push(`\nEstás mergeando la rama '${this.mergeState.fromBranch}'.`);
      const unresolved = [...this.mergeState.conflicts].filter(
        (f) => !this.stagingArea.has(f) || hasConflictMarkers(this.stagingArea.get(f))
      );
      if (unresolved.length) {
        lines.push('\nRutas no fusionadas:');
        lines.push('  (edita los archivos, resuelve los conflictos y haz `git add`)');
        unresolved.forEach((f) => lines.push(`  ambos modificados:   ${f}`));
      } else {
        lines.push('\nTodos los conflictos resueltos. Haz `git commit` para finalizar el merge.');
      }
    }

    const tree = this._currentTree();

    if (this.stagingArea.size > 0) {
      lines.push('\nCambios para hacer commit:');
      [...this.stagingArea.keys()].forEach((f) =>
        lines.push(tree.has(f) ? `  modificado:      ${f}` : `  nuevo archivo:   ${f}`)
      );
    }

    // Working directory: distinguir modificados (trackeados) de sin seguimiento.
    // Los archivos que matchean .gitignore no aparecen (como en git real).
    const wdFiles = [...this.workingDirectory.keys()];
    const modified = wdFiles.filter((f) => tree.has(f) || this.stagingArea.has(f));
    const untracked = wdFiles.filter(
      (f) => !tree.has(f) && !this.stagingArea.has(f) && !this._isIgnored(f)
    );

    if (modified.length > 0) {
      lines.push('\nCambios no preparados:');
      lines.push('  (usa "git add <archivo>" para actualizar lo que se commiteará)');
      modified.forEach((f) => lines.push(`  modificado:   ${f}`));
    }
    if (untracked.length > 0) {
      lines.push('\nArchivos sin seguimiento:');
      lines.push('  (usa "git add <archivo>" para incluirlo en lo que se commiteará)');
      untracked.forEach((f) => lines.push(`  ${f}`));
    }
    if (
      !this.mergeState &&
      this.stagingArea.size === 0 &&
      modified.length === 0 &&
      untracked.length === 0
    ) {
      lines.push('\nNada que hacer commit, el árbol de trabajo está limpio');
    }
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

  // ── Diff ──────────────────────────────────────────────────────────────

  diff(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('diff', args);

    const staged = args.includes('--staged') || args.includes('--cached');
    const tree = this._currentTree();

    const blocks = [];
    if (staged) {
      // staging vs último commit
      for (const [name, content] of this.stagingArea.entries()) {
        const before = tree.get(name) ?? '';
        if (before === content) continue;
        blocks.push(this._formatDiff(name, before, content));
      }
    } else {
      // workingDir vs (staging si existe, sino último commit)
      for (const [name, content] of this.workingDirectory.entries()) {
        const before = this.stagingArea.get(name) ?? tree.get(name) ?? '';
        if (before === content) continue;
        blocks.push(this._formatDiff(name, before, content));
      }
    }
    if (!blocks.length) return { ok: true, output: '' };
    return { ok: true, output: blocks.join('\n') };
  }

  _formatDiff(filename, before, after) {
    const beforeLines = before === '' ? [] : before.split('\n');
    const afterLines = after === '' ? [] : after.split('\n');
    const header = [
      `diff --git a/${filename} b/${filename}`,
      before === '' ? `--- /dev/null` : `--- a/${filename}`,
      after === '' ? `+++ /dev/null` : `+++ b/${filename}`,
    ];
    // LCS para hacer un diff de líneas razonable.
    const ops = lcsDiff(beforeLines, afterLines);
    const body = ops.map(({ type, line }) => {
      if (type === 'add') return `+${line}`;
      if (type === 'del') return `-${line}`;
      return ` ${line}`;
    });
    return [...header, ...body].join('\n');
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
    // git branch <nombre> [<ref>]  → la ref opcional permite recuperar commits (reflog).
    const startPoint = args[1] ? this._resolveRef(args[1]) : this._currentCommitHash();
    if (args[1] && !startPoint) {
      return { ok: false, output: `fatal: no es un nombre de objeto válido: '${args[1]}'` };
    }
    if (!startPoint) {
      return { ok: false, output: `fatal: aún no hay commits en '${this.HEAD}'.\nCrea el primer commit antes de crear ramas.` };
    }
    this.branches.set(name, startPoint);
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
    if (args[0] === '--abort') return this._mergeAbort();
    if (!args.length) return { ok: false, output: 'Uso: git merge <rama>' };
    if (this.mergeState) {
      return { ok: false, output: 'Ya hay un merge en curso.\nResuelve los conflictos y commitea, o usa `git merge --abort`.' };
    }
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

    // 3-way merge: detectar conflictos archivo a archivo
    const baseHash = this._findCommonAncestor(currentHash, targetHash);
    const baseTree = baseHash ? this._treeOf(baseHash) : new Map();
    const currentTree = currentHash ? this._treeOf(currentHash) : new Map();
    const targetTree = this._treeOf(targetHash);

    const mergedTree = new Map(currentTree);
    const conflicts = new Set();
    const allFiles = new Set([...currentTree.keys(), ...targetTree.keys(), ...baseTree.keys()]);

    for (const f of allFiles) {
      const base = baseTree.get(f);
      const ours = currentTree.get(f);
      const theirs = targetTree.get(f);

      if (ours === theirs) {
        // Idéntico en ambos lados.
        if (ours !== undefined) mergedTree.set(f, ours);
        else mergedTree.delete(f);
        continue;
      }
      if (ours === base) {
        // Solo cambió "ellos": aplicar el suyo.
        if (theirs === undefined) mergedTree.delete(f);
        else mergedTree.set(f, theirs);
        continue;
      }
      if (theirs === base) {
        // Solo cambiamos "nosotros": dejar el nuestro (ya está).
        continue;
      }
      // Ambos cambiaron de forma divergente → CONFLICTO.
      conflicts.add(f);
      const conflictContent = buildConflictMarkers(ours ?? '', theirs ?? '', this.HEAD, target);
      mergedTree.set(f, conflictContent);
      // El archivo en conflicto pasa al workingDir con los marcadores.
      this.workingDirectory.set(f, conflictContent);
    }

    if (conflicts.size === 0) {
      // Merge limpio (3-way sin conflictos).
      const hash = generateHash();
      this.commits.set(hash, {
        hash, message: `Merge branch '${target}'`,
        parent: currentHash, secondParent: targetHash,
        timestamp: Date.now(), author: 'Tú',
        files: [...mergedTree.keys()].filter((n) => currentTree.get(n) !== mergedTree.get(n)),
        tree: mergedTree,
      });
      this.branches.set(this.HEAD, hash);
      this._addReflog(this.HEAD, hash, `merge ${target}: Merge realizado`);
      return { ok: true, output: `Merge realizado (estrategia 'ort').\ncommit de merge: ${hash}` };
    }

    // Hay conflictos: dejar mergeState abierto para que el usuario resuelva.
    this.mergeState = {
      fromBranch: target,
      fromHash: targetHash,
      conflicts: new Set(conflicts),
    };
    // Los archivos sin conflicto se añaden directamente al staging (como hace Git real).
    for (const [f, content] of mergedTree.entries()) {
      if (conflicts.has(f)) continue;
      if (currentTree.get(f) !== content) {
        this.stagingArea.set(f, content);
      }
    }
    const list = [...conflicts].map((f) => `  CONFLICTO (contenido): merge conflict en ${f}`).join('\n');
    return {
      ok: false,
      output: `Auto-merging…\n${list}\nMerge automático fallido. Resuelve los conflictos y commitea el resultado.\nO ejecuta \`git merge --abort\`.`,
    };
  }

  _mergeAbort() {
    if (!this.mergeState) return { ok: false, output: 'No hay ningún merge en curso.' };
    // Devolver workingDir y staging al estado previo: descartar conflictos y cambios staged del merge.
    const currentHash = this._currentCommitHash();
    const currentTree = currentHash ? this._treeOf(currentHash) : new Map();
    for (const f of this.mergeState.conflicts) {
      // Restaurar el archivo como estaba en HEAD.
      if (currentTree.has(f)) this.workingDirectory.set(f, currentTree.get(f));
      else this.workingDirectory.delete(f);
    }
    this.stagingArea = new Map();
    this.mergeState = null;
    return { ok: true, output: 'Merge abortado. Vuelves al estado anterior.' };
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

    const targetHash = this._resolveRef(refArg);
    if (!targetHash) {
      // git reset <archivo>  → sacar el archivo del staging (como git real).
      if (mode === '--mixed' && this.stagingArea.has(refArg)) {
        this._unstageFile(refArg);
        this._setLast('reset', ['--mixed', refArg]);
        return { ok: true, output: `Cambios no preparados tras el reset:\nM\t${refArg}` };
      }
      return {
        ok: false,
        output: `fatal: argumento ambiguo '${refArg}': revisión o ruta desconocida.\nPista: mira los hashes disponibles con \`git log\` o \`git reflog\`.`,
      };
    }

    if (mode === '--soft' && this.mergeState) {
      return { ok: false, output: 'fatal: no se puede hacer un reset --soft en medio de un merge.' };
    }
    this._setLast('reset', [mode, refArg]);

    if (this._isDetached()) this.HEAD = targetHash;
    else this.branches.set(this.HEAD, targetHash);

    if (mode === '--mixed' || mode === '--hard') {
      this.stagingArea = new Map();
      this.mergeState = null; // reset aborta cualquier merge en curso
    }
    if (mode === '--hard') this.workingDirectory = new Map();

    this._addReflog(this.HEAD, targetHash, `reset: moving to ${refArg}`);
    const modeLabel = { '--soft': 'soft', '--mixed': 'mixed', '--hard': 'hard' }[mode];
    return { ok: true, output: `HEAD apunta ahora a ${targetHash} (modo ${modeLabel})` };
  }

  // git restore [--staged] <archivo>...
  restore(args) {
    if (!this.initialized) return this._notInit();
    const staged = args.includes('--staged');
    const files = args.filter((a) => !a.startsWith('-'));
    if (!files.length) {
      return { ok: false, output: 'Uso: git restore <archivo>          (descarta cambios del working directory)\n       git restore --staged <archivo> (saca el archivo del staging)' };
    }
    this._setLast('restore', args);

    const tree = this._currentTree();
    for (const f of files) {
      if (staged) {
        if (!this.stagingArea.has(f)) {
          return { ok: false, output: `error: la ruta '${f}' no está en el staging.` };
        }
        this._unstageFile(f);
      } else {
        if (this.workingDirectory.has(f)) {
          // Descartar la versión del working dir: vuelve la del staging/commit.
          this.workingDirectory.delete(f);
        } else if (!tree.has(f) && !this.stagingArea.has(f)) {
          return { ok: false, output: `error: la ruta '${f}' no coincide con ningún archivo conocido.` };
        }
      }
    }
    return { ok: true, output: '' };
  }

  // Reglas activas de .gitignore (se lee del working dir, staging o árbol actual).
  _ignoreRules() {
    const content =
      this.workingDirectory.get('.gitignore') ??
      this.stagingArea.get('.gitignore') ??
      this._currentTree().get('.gitignore');
    return parseIgnoreRules(content);
  }

  // Un archivo solo puede ignorarse si aún no está trackeado (como en git real).
  _isIgnored(name) {
    if (this.stagingArea.has(name) || this._currentTree().has(name)) return false;
    return matchesIgnore(name, this._ignoreRules());
  }

  // Saca un archivo del staging conservando su contenido si difiere del commit.
  _unstageFile(name) {
    const content = this.stagingArea.get(name);
    this.stagingArea.delete(name);
    const tree = this._currentTree();
    if (tree.get(name) !== content) {
      this.workingDirectory.set(name, content);
    }
  }

  revert(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git revert <hash>' };
    this._setLast('revert', args);

    const target = this._findCommit(args[0]);
    if (!target) return { ok: false, output: `error: no existe el commit '${args[0]}'.` };

    const original = this.commits.get(target);
    const hash = generateHash();
    const parentHash = this._currentCommitHash();
    const parentTree = parentHash ? this._treeOf(parentHash) : new Map();
    // Revertir: aplicar el "inverso" de original sobre el árbol actual.
    const originalParentTree = original.parent ? this._treeOf(original.parent) : new Map();
    const revertedTree = new Map(parentTree);
    for (const name of original.files) {
      if (originalParentTree.has(name)) {
        revertedTree.set(name, originalParentTree.get(name));
      } else {
        revertedTree.delete(name);
      }
    }
    this.commits.set(hash, {
      hash, message: `Revert "${original.message}"`,
      parent: parentHash, secondParent: null,
      timestamp: Date.now(), author: 'Tú',
      files: original.files,
      tree: revertedTree,
    });

    if (this._isDetached()) this.HEAD = hash;
    else this.branches.set(this.HEAD, hash);

    this._addReflog(this.HEAD, hash, `revert: Revert "${original.message}"`);
    return { ok: true, output: `[${this.HEAD} ${hash}] Revert "${original.message}"\n${original.files.length} archivo(s) cambiado(s)` };
  }

  stash(args) {
    if (!this.initialized) return this._notInit();
    const sub = args[0] ?? 'push';
    this._setLast('stash', args.length ? args : ['push']);

    if (sub === 'push' || sub === 'save') {
      if (this.stagingArea.size === 0 && this.workingDirectory.size === 0) {
        return { ok: false, output: 'No hay cambios locales para guardar en el stash.' };
      }
      this.stash.unshift({
        stagingArea: new Map(this.stagingArea),
        workingDirectory: new Map(this.workingDirectory),
        message: `WIP on ${this.HEAD}: ${this._currentCommitHash() ?? 'empty'}`,
      });
      this.stagingArea = new Map();
      this.workingDirectory = new Map();
      return { ok: true, output: `Guardado el estado de trabajo en stash@{0}` };
    }
    if (sub === 'pop') {
      if (!this.stash.length) return { ok: false, output: 'No hay entradas en el stash.' };
      const entry = this.stash.shift();
      entry.stagingArea.forEach((v, k) => this.stagingArea.set(k, v));
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
    const parentHash = this._currentCommitHash();
    const parentTree = parentHash ? this._treeOf(parentHash) : new Map();
    const originalTree = original.tree ?? new Map();
    const newTree = new Map(parentTree);
    for (const name of original.files) {
      if (originalTree.has(name)) newTree.set(name, originalTree.get(name));
    }
    this.commits.set(hash, {
      hash, message: original.message,
      parent: parentHash, secondParent: null,
      timestamp: Date.now(), author: 'Tú',
      files: [...original.files],
      tree: newTree,
    });

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
      const parentTree = this._treeOf(newParent);
      const newTree = new Map(parentTree);
      for (const name of c.files) {
        if (c.tree?.has(name)) newTree.set(name, c.tree.get(name));
      }
      this.commits.set(newHash, {
        hash: newHash, message: c.message,
        parent: newParent, secondParent: null,
        timestamp: Date.now(), author: c.author,
        files: [...c.files],
        tree: newTree,
      });
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

  // ── Remoto "origin" ───────────────────────────────────────────────────

  push(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('push', args);

    // git push [origin] [rama]
    const filtered = args.filter((a) => a !== 'origin');
    const branchArg = filtered[0] ?? this.HEAD;
    if (!this.branches.has(branchArg)) {
      return { ok: false, output: `error: src refspec '${branchArg}' no coincide con ninguna rama local.` };
    }
    const localHash = this.branches.get(branchArg);
    if (!localHash) {
      return { ok: false, output: `La rama '${branchArg}' no tiene commits para pushear.` };
    }

    // Rechazar si el remoto está por delante (necesitarías pull primero).
    const remoteHash = this.remoteBranches.get(branchArg);
    if (remoteHash && remoteHash !== localHash && !this._isAncestor(remoteHash, localHash)) {
      return {
        ok: false,
        output: `! [rejected] ${branchArg} (non-fast-forward)\nLa rama remota tiene commits que tú no tienes. Haz \`git pull\` primero.`,
      };
    }

    // Recolectar commits alcanzables desde localHash (ambos padres) que no estén en el remoto.
    const toPush = [];
    const stack = [localHash];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur) || this.remoteCommits.has(cur)) continue;
      seen.add(cur);
      const c = this.commits.get(cur);
      if (!c) continue;
      toPush.push(c);
      stack.push(c.parent, c.secondParent);
    }
    for (const c of toPush) {
      // Copia profunda de árbol y files.
      this.remoteCommits.set(c.hash, {
        ...c,
        files: [...c.files],
        tree: c.tree instanceof Map ? new Map(c.tree) : new Map(),
      });
    }
    this.remoteBranches.set(branchArg, localHash);
    this.remoteRefs.set(`origin/${branchArg}`, localHash);

    const shortHash = localHash.slice(0, 7);
    const summary = toPush.length === 0
      ? 'Todo actualizado.'
      : `${toPush.length} commit(s) subido(s).\n   ${remoteHash?.slice(0, 7) ?? '(nuevo)'}..${shortHash}  ${branchArg} -> ${branchArg}`;
    return { ok: true, output: `To origin\n   ${summary}` };
  }

  fetch(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('fetch', args);

    if (this.remoteBranches.size === 0) {
      return { ok: true, output: 'No hay nada que fetchear (remoto vacío).' };
    }
    const updates = [];
    for (const [branch, hash] of this.remoteBranches.entries()) {
      const ref = `origin/${branch}`;
      const prev = this.remoteRefs.get(ref);
      this.remoteRefs.set(ref, hash);
      // Copiar commits del remoto a local (alcanzables desde hash, ambos padres) si no estaban.
      const stack = [hash];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || this.commits.has(cur)) continue;
        const c = this.remoteCommits.get(cur);
        if (!c) continue;
        this.commits.set(cur, {
          ...c,
          files: [...c.files],
          tree: c.tree instanceof Map ? new Map(c.tree) : new Map(),
        });
        stack.push(c.parent, c.secondParent);
      }
      if (prev !== hash) updates.push(`   ${(prev ?? '(nuevo)').slice(0, 7)}..${hash.slice(0, 7)}  ${branch} -> origin/${branch}`);
    }
    return {
      ok: true,
      output: updates.length ? `From origin\n${updates.join('\n')}` : 'Todo actualizado.',
    };
  }

  pull(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('pull', args);
    const fetched = this.fetch([]);
    if (!fetched.ok) return fetched;
    // Mergear origin/HEAD en HEAD.
    const branch = this.HEAD;
    if (!this.branches.has(branch)) {
      return { ok: false, output: 'No puedes hacer pull en HEAD desacoplado.' };
    }
    const remoteHash = this.remoteBranches.get(branch);
    if (!remoteHash) {
      return { ok: false, output: `La rama '${branch}' no existe en origin.` };
    }
    // Reusar merge: simular un merge desde un "pseudo-branch" origin/<branch>.
    const localHash = this.branches.get(branch);
    if (remoteHash === localHash) return { ok: true, output: `${fetched.output}\nYa está actualizado.` };
    if (this._isAncestor(localHash, remoteHash)) {
      this.branches.set(branch, remoteHash);
      this._addReflog(branch, remoteHash, `pull: Fast-forward to ${remoteHash}`);
      return { ok: true, output: `${fetched.output}\nAvance rápido (Fast-forward) ${localHash?.slice(0, 7) ?? '(inicio)'} → ${remoteHash.slice(0, 7)}` };
    }
    // Si no es FF, reproducir lógica de merge 3-way con origin/branch como target.
    const tmpBranch = `origin/${branch}`;
    // Truco: temporalmente añadir origin/branch como rama para reusar merge().
    this.branches.set(tmpBranch, remoteHash);
    const mergeResult = this.merge([tmpBranch]);
    this.branches.delete(tmpBranch);
    return { ok: mergeResult.ok, output: `${fetched.output}\n${mergeResult.output}` };
  }

  clone(args) {
    if (!args.length) return { ok: false, output: 'Uso: git clone <url>' };
    this._setLast('clone', args);
    if (this.initialized) return { ok: false, output: 'fatal: ya hay un repositorio en este directorio.' };
    // Simular clone: si hay un remoto preparado, lo copiamos.
    this.initialized = true;
    if (this.remoteBranches.size > 0) {
      // Copiar commits y branches del remoto a local.
      for (const [hash, c] of this.remoteCommits.entries()) {
        this.commits.set(hash, {
          ...c,
          files: [...c.files],
          tree: c.tree instanceof Map ? new Map(c.tree) : new Map(),
        });
      }
      for (const [b, h] of this.remoteBranches.entries()) {
        this.branches.set(b, h);
        this.remoteRefs.set(`origin/${b}`, h);
      }
      this.HEAD = this.branches.has('main') ? 'main' : [...this.branches.keys()][0] ?? 'main';
    } else {
      this.branches.set('main', null);
      this.HEAD = 'main';
    }
    this._addReflog('HEAD', this.branches.get(this.HEAD), `clone: from ${args[0]}`);
    return { ok: true, output: `Clonando en '${args[0]}'…\nlisto.` };
  }

  // API para que la UI cree/mergee PRs (no es un comando git).
  openPullRequest({ from, into, title, body }) {
    if (!from || !into) return { ok: false, output: 'Faltan rama origen o destino.' };
    if (from === into) return { ok: false, output: 'La rama origen y destino no pueden ser iguales.' };
    if (!this.remoteBranches.has(from)) {
      return { ok: false, output: `La rama '${from}' no existe en origin. Haz \`git push\` primero.` };
    }
    if (!this.remoteBranches.has(into)) {
      return { ok: false, output: `La rama '${into}' no existe en origin.` };
    }
    if (this.pullRequests.some((p) => p.state === 'open' && p.from === from && p.into === into)) {
      return { ok: false, output: 'Ya existe un PR abierto para esa combinación.' };
    }
    const id = ++this.prCounter;
    const fromHash = this.remoteBranches.get(from);
    const intoHash = this.remoteBranches.get(into);
    // Commits únicos en from que no están en into (recorriendo ambos padres).
    const intoAncestors = this._collectAncestors(intoHash, this.remoteCommits);
    const prCommits = [];
    const stack = [fromHash];
    const seen = new Set();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || seen.has(cur) || intoAncestors.has(cur)) continue;
      seen.add(cur);
      prCommits.push(cur);
      const c = this.remoteCommits.get(cur);
      if (c) stack.push(c.parent, c.secondParent);
    }
    this.pullRequests.unshift({
      id,
      title: title || `${from} → ${into}`,
      body: body || '',
      from,
      into,
      state: 'open',
      commits: prCommits,
      author: 'Tú',
      openedAt: Date.now(),
    });
    return { ok: true, output: `PR #${id} abierto: ${from} → ${into}` };
  }

  mergePullRequest(prId) {
    const pr = this.pullRequests.find((p) => p.id === prId);
    if (!pr) return { ok: false, output: `PR #${prId} no encontrado.` };
    if (pr.state !== 'open') return { ok: false, output: `El PR #${prId} ya está ${pr.state}.` };

    // Hacer merge en el remoto: fast-forward o 3-way (simplificado: FF si posible, sino crear merge commit).
    const fromHash = this.remoteBranches.get(pr.from);
    const intoHash = this.remoteBranches.get(pr.into);
    if (!fromHash || !intoHash) return { ok: false, output: 'Ramas del PR no existen en origin.' };

    // ¿FF?
    if (this._isAncestor(intoHash, fromHash, this.remoteCommits)) {
      this.remoteBranches.set(pr.into, fromHash);
      this.remoteRefs.set(`origin/${pr.into}`, fromHash);
    } else {
      // Merge commit en el remoto.
      const mergeHash = generateHash();
      const intoTree = this.remoteCommits.get(intoHash)?.tree ?? new Map();
      const fromTree = this.remoteCommits.get(fromHash)?.tree ?? new Map();
      const mergedTree = new Map(intoTree);
      fromTree.forEach((v, k) => mergedTree.set(k, v));
      this.remoteCommits.set(mergeHash, {
        hash: mergeHash,
        message: `Merge pull request #${pr.id} from ${pr.from}`,
        parent: intoHash,
        secondParent: fromHash,
        timestamp: Date.now(),
        author: 'github-bot',
        files: [...mergedTree.keys()].filter((k) => intoTree.get(k) !== mergedTree.get(k)),
        tree: mergedTree,
      });
      this.remoteBranches.set(pr.into, mergeHash);
      this.remoteRefs.set(`origin/${pr.into}`, mergeHash);
    }
    pr.state = 'merged';
    pr.mergedAt = Date.now();
    return { ok: true, output: `PR #${pr.id} mergeado en ${pr.into}.` };
  }

  closePullRequest(prId) {
    const pr = this.pullRequests.find((p) => p.id === prId);
    if (!pr) return { ok: false, output: `PR #${prId} no encontrado.` };
    if (pr.state !== 'open') return { ok: false, output: `El PR #${prId} ya está ${pr.state}.` };
    pr.state = 'closed';
    pr.closedAt = Date.now();
    return { ok: true, output: `PR #${pr.id} cerrado sin merge.` };
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

  _switchTo(target) {
    const prev = this.HEAD;
    if (this.branches.has(target)) {
      this.HEAD = target;
      this._addReflog('HEAD', this.branches.get(target), `checkout: moverse de ${prev} a ${target}`);
      return { ok: true, output: `Cambiado a rama '${target}'` };
    }
    // Acepta hash completo o abreviado (prefijo).
    const hash = this._findCommit(target);
    if (hash) {
      this.HEAD = hash;
      this._addReflog('HEAD', hash, `checkout: moverse a ${hash} (HEAD desacoplado)`);
      return { ok: true, output: `HEAD desacoplado en ${hash}` };
    }
    return { ok: false, output: `error: pathspec '${target}' no coincide con ningún archivo o rama conocida.` };
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

  _findCommonAncestor(hashA, hashB) {
    const ancestorsA = this._collectAncestors(hashA);
    // BFS desde B para encontrar el ancestro común más cercano a B.
    const queue = [hashB];
    const visited = new Set();
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || visited.has(cur)) continue;
      if (ancestorsA.has(cur)) return cur;
      visited.add(cur);
      const c = this.commits.get(cur);
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

function buildConflictMarkers(ours, theirs, ourLabel = 'HEAD', theirLabel = 'theirs') {
  const lines = [];
  lines.push(`<<<<<<< ${ourLabel}`);
  if (ours) lines.push(...ours.split('\n'));
  lines.push('=======');
  if (theirs) lines.push(...theirs.split('\n'));
  lines.push(`>>>>>>> ${theirLabel}`);
  return lines.join('\n');
}

function hasConflictMarkers(content) {
  return typeof content === 'string' && /^<<<<<<< /m.test(content) && /^>>>>>>> /m.test(content);
}

// LCS-based line diff. Produce una lista de {type, line} con 'add', 'del', 'ctx'.
function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: 'ctx', line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', line: a[i] }); i++; }
    else { ops.push({ type: 'add', line: b[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'del', line: a[i++] }); }
  while (j < m) { ops.push({ type: 'add', line: b[j++] }); }
  return ops;
}
