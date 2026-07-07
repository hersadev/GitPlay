import { generateHash } from '../../utils/hashGenerator.js';
import { buildConflictMarkers } from '../../utils/conflicts.js';

// ── Merge ─────────────────────────────────────────────────────────────
// merge (fast-forward y 3-way con conflictos) y sus helpers, que también
// usa pull(). Se montan sobre GitEngine.prototype (ver GitEngine.js).

export const mergeCommands = {
  merge(args) {
    if (!this.initialized) return this._notInit();
    if (args[0] === '--abort') return this._mergeAbort();
    if (!args.length) return { ok: false, output: 'Uso: git merge <rama>' };
    if (this.rebaseState) {
      return { ok: false, output: 'Hay un rebase en curso.\nTermínalo con `git rebase --continue` o cancélalo con `git rebase --abort`.' };
    }
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

    // Como git real: abortar si el merge pisaría cambios locales sin commitear.
    const pisados = this._localChangesOverwrittenBy(currentHash, targetHash);
    if (pisados.length) return this._overwrittenByMergeError(pisados);

    if (this._isAncestor(currentHash, targetHash)) {
      // En detached solo se mueve HEAD (como git real): nada de crear "ramas" con nombre de hash.
      if (this._isDetached()) this.HEAD = targetHash;
      else this.branches.set(this.HEAD, targetHash);
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
      if (this._isDetached()) this.HEAD = hash;
      else this.branches.set(this.HEAD, hash);
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
  },

  // Archivos con cambios sin commitear (working o staging) que el merge de
  // `targetHash` sobre `currentHash` modificaría. Git real aborta en ese caso
  // en vez de pisarlos; merge() y pull() usan esta lista para imitarlo.
  _localChangesOverwrittenBy(currentHash, targetHash) {
    const baseHash = this._findCommonAncestor(currentHash, targetHash);
    const baseTree = baseHash ? this._treeOf(baseHash) : new Map();
    const currentTree = currentHash ? this._treeOf(currentHash) : new Map();
    const targetTree = this._treeOf(targetHash);
    const dirty = [];
    for (const f of new Set([...currentTree.keys(), ...targetTree.keys()])) {
      const ours = currentTree.get(f);
      const theirs = targetTree.get(f);
      if (ours === theirs) continue; // idéntico en ambos lados: el merge no lo toca
      if (theirs === baseTree.get(f)) continue; // solo cambiamos nosotros: se conserva el nuestro
      if (this.workingDirectory.has(f) || this.stagingArea.has(f)) dirty.push(f);
    }
    return dirty;
  },

  _overwrittenByMergeError(files) {
    return {
      ok: false,
      output:
        'error: Tus cambios locales en los siguientes archivos serían sobrescritos por el merge:\n' +
        files.map((f) => `  ${f}`).join('\n') +
        '\nHaz commit de tus cambios (o `git stash`) antes de mergear.\nAbortando',
    };
  },

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
  },
};
