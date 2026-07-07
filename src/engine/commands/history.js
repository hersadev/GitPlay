import { generateHash } from '../../utils/hashGenerator.js';

// ── Historia ──────────────────────────────────────────────────────────
// Comandos que reescriben o inspeccionan la historia: reset, restore,
// revert, cherry-pick, stash, tag y reflog.
// Se montan sobre GitEngine.prototype (ver GitEngine.js), por eso usan `this`.

export const historyCommands = {
  gitReset(args) {
    if (!this.initialized) return this._notInit();
    if (this.rebaseState) {
      return { ok: false, output: 'Hay un rebase en curso.\nUsa `git rebase --continue` para terminarlo o `git rebase --abort` para cancelarlo.' };
    }

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
  },

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
  },

  // Saca un archivo del staging conservando su contenido si difiere del commit.
  _unstageFile(name) {
    const content = this.stagingArea.get(name);
    this.stagingArea.delete(name);
    const tree = this._currentTree();
    if (tree.get(name) !== content) {
      this.workingDirectory.set(name, content);
    }
  },

  revert(args) {
    if (!this.initialized) return this._notInit();
    if (this.rebaseState) {
      return { ok: false, output: 'Hay un rebase en curso.\nTermínalo con `git rebase --continue` o cancélalo con `git rebase --abort`.' };
    }
    if (!args.length) return { ok: false, output: 'Uso: git revert <hash>\n       git revert HEAD' };
    this._setLast('revert', args);

    // Como en git real: acepta HEAD, HEAD~n, ramas, tags y hashes.
    const target = this._resolveRef(args[0]);
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
  },

  stash(args) {
    if (!this.initialized) return this._notInit();
    const sub = args[0] ?? 'push';
    this._setLast('stash', args.length ? args : ['push']);

    if (sub === 'push' || sub === 'save') {
      if (this.stagingArea.size === 0 && this.workingDirectory.size === 0) {
        return { ok: false, output: 'No hay cambios locales para guardar en el stash.' };
      }
      this.stashEntries.unshift({
        stagingArea: new Map(this.stagingArea),
        workingDirectory: new Map(this.workingDirectory),
        message: `WIP on ${this.HEAD}: ${this._currentCommitHash() ?? 'empty'}`,
      });
      this.stagingArea = new Map();
      this.workingDirectory = new Map();
      return { ok: true, output: `Guardado el estado de trabajo en stash@{0}` };
    }
    if (sub === 'pop') {
      if (!this.stashEntries.length) return { ok: false, output: 'No hay entradas en el stash.' };
      const entry = this.stashEntries.shift();
      entry.stagingArea.forEach((v, k) => this.stagingArea.set(k, v));
      entry.workingDirectory.forEach((v, k) => this.workingDirectory.set(k, v));
      return { ok: true, output: 'Cambios restaurados del stash.' };
    }
    if (sub === 'list') {
      if (!this.stashEntries.length) return { ok: true, output: '(stash vacío)' };
      return { ok: true, output: this.stashEntries.map((e, i) => `stash@{${i}}: ${e.message}`).join('\n') };
    }
    if (sub === 'drop') {
      if (!this.stashEntries.length) return { ok: false, output: 'No hay entradas en el stash.' };
      this.stashEntries.shift();
      return { ok: true, output: 'Eliminada stash@{0}' };
    }
    return { ok: false, output: `error: subcomando desconocido '${sub}'` };
  },

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
    // git tag [-a] <nombre> [-m "mensaje"] [<ref>] — el simulador no distingue
    // annotated de lightweight, pero acepta la sintaxis para que `-a` no acabe
    // convertido en el nombre de la etiqueta.
    const rest = [...args];
    const annotated = rest[0] === '-a';
    if (annotated) rest.shift();
    const mIdx = rest.indexOf('-m');
    let message = null;
    if (mIdx !== -1) {
      message = rest[mIdx + 1];
      if (message === undefined) return { ok: false, output: 'fatal: falta el mensaje tras -m.' };
      rest.splice(mIdx, 2);
    }
    if (annotated && message === null) {
      return { ok: false, output: 'fatal: un tag anotado necesita mensaje: git tag -a <nombre> -m "mensaje"' };
    }
    const name = rest.shift();
    if (!name || name.startsWith('-')) {
      return { ok: false, output: 'Uso: git tag <nombre> [<hash>]\n       git tag -a <nombre> -m "mensaje"' };
    }
    const targetHash = rest[0] ? this._resolveRef(rest[0]) : this._currentCommitHash();
    if (!targetHash) return { ok: false, output: 'No hay commits para etiquetar.' };
    this.tags.set(name, targetHash);
    return { ok: true, output: '' };
  },

  cherryPick(args) {
    if (!this.initialized) return this._notInit();
    if (this.rebaseState) {
      return { ok: false, output: 'Hay un rebase en curso.\nTermínalo con `git rebase --continue` o cancélalo con `git rebase --abort`.' };
    }
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
  },

  reflog() {
    if (!this.initialized) return this._notInit();
    this._setLast('reflog', []);
    if (!this.reflogHistory.length) return { ok: true, output: '(historial vacío)' };
    return { ok: true, output: this.reflogHistory.map((e, i) => `${(e.hash ?? '0000000').padEnd(7)} HEAD@{${i}}: ${e.message}`).join('\n') };
  },
};
