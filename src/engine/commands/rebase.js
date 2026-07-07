import { generateHash } from '../../utils/hashGenerator.js';
import { hasConflictMarkers, buildConflictMarkers } from '../../utils/conflicts.js';

// ── Rebase ────────────────────────────────────────────────────────────
// rebase con reaplicación commit a commit, pausa en conflictos y
// --continue / --abort. Se montan sobre GitEngine.prototype (ver GitEngine.js).

export const rebaseCommands = {
  rebase(args) {
    if (!this.initialized) return this._notInit();
    if (args[0] === '--continue') return this._rebaseContinue();
    if (args[0] === '--abort') return this._rebaseAbort();
    if (!args.length) return { ok: false, output: 'Uso: git rebase <rama>\n       git rebase --continue | --abort' };
    if (this.rebaseState) {
      return { ok: false, output: 'Ya hay un rebase en curso.\nResuelve los conflictos y usa `git rebase --continue`, o cancela con `git rebase --abort`.' };
    }
    if (this.mergeState) {
      return { ok: false, output: 'Hay un merge en curso.\nTermínalo (o `git merge --abort`) antes de rebasear.' };
    }
    this._setLast('rebase', args);

    const target = args[0];
    const targetHash = this.branches.get(target) ?? this._resolveRef(target);
    if (!targetHash) return { ok: false, output: `error: la rama '${target}' no existe.` };
    if (target === this.HEAD) return { ok: false, output: 'No puedes hacer rebase sobre tu propia rama.' };
    if (this._isDetached()) return { ok: false, output: 'No puedes rebasear con HEAD desacoplado. Vuelve a una rama primero.' };

    // Como en git real: exige un árbol limpio antes de rebasear.
    const tree = this._currentTree();
    const dirtyTracked = [...this.workingDirectory.keys()].filter((f) => tree.has(f));
    if (this.stagingArea.size > 0 || dirtyTracked.length > 0) {
      return {
        ok: false,
        output: 'error: tienes cambios sin commitear.\nHaz commit o guárdalos con `git stash` antes de rebasear.',
      };
    }

    const currentHash = this._currentCommitHash();
    const ancestor = this._findCommonAncestor(currentHash, targetHash);

    const toReapply = [];
    let h = currentHash;
    while (h && h !== ancestor) {
      const c = this.commits.get(h);
      if (!c) break;
      toReapply.unshift(c.hash);
      h = c.parent;
    }

    if (!toReapply.length) return { ok: true, output: 'Ya está actualizado.' };

    this.rebaseState = {
      branch: this.HEAD,
      target,
      originalTip: currentHash,
      newParent: targetHash,
      todo: toReapply,
      created: [],
      conflicts: new Set(),
      hadConflicts: false, // para distinguir en el reflog un rebase con conflictos resueltos
    };
    return this._rebaseStep();
  },

  // Reaplica commits pendientes hasta terminar o toparse con un conflicto.
  _rebaseStep() {
    const rs = this.rebaseState;
    while (rs.todo.length) {
      const c = this.commits.get(rs.todo[0]);
      const parentTree = this._treeOf(rs.newParent);
      const baseTree = c.parent ? this._treeOf(c.parent) : new Map();
      const newTree = new Map(parentTree);
      const conflicts = new Set();

      for (const f of c.files) {
        const theirs = c.tree?.get(f);       // lo que trae tu commit
        if (theirs === undefined) continue;
        const ours = parentTree.get(f);      // lo que ya hay en la nueva base
        const base = baseTree.get(f);
        if (ours === theirs) continue;                        // idéntico en ambos lados
        if (ours === undefined || ours === base) {            // solo cambió tu commit
          newTree.set(f, theirs);
          continue;
        }
        conflicts.add(f);                                     // ambos divergen → conflicto
      }

      if (conflicts.size > 0) {
        rs.conflicts = conflicts;
        rs.hadConflicts = true;
        // Los archivos sin conflicto del commit quedan preparados (staging),
        // como hace git real: se incluirán al hacer --continue.
        for (const f of c.files) {
          if (conflicts.has(f)) continue;
          const content = newTree.get(f);
          if (content !== undefined && parentTree.get(f) !== content) {
            this.stagingArea.set(f, content);
          }
        }
        for (const f of conflicts) {
          // Ojo con la semántica de rebase: "ours" (HEAD) es la nueva base
          // (p.ej. main con el trabajo del compañero) y "theirs" es TU commit reaplicado.
          const marked = buildConflictMarkers(
            parentTree.get(f) ?? '',
            c.tree?.get(f) ?? '',
            'HEAD',
            `${c.hash} (${c.message})`
          );
          this.workingDirectory.set(f, marked);
        }
        const list = [...conflicts].map((f) => `  CONFLICTO (contenido): merge conflict en ${f}`).join('\n');
        return {
          ok: false,
          output: `Reaplicando: ${c.message}\n${list}\nResuelve los conflictos, haz \`git add\`, y sigue con \`git rebase --continue\`.\nO cancela con \`git rebase --abort\`.`,
        };
      }

      // Sin conflictos: crear el commit reaplicado y avanzar.
      const newHash = generateHash();
      this.commits.set(newHash, {
        hash: newHash, message: c.message,
        parent: rs.newParent, secondParent: null,
        timestamp: Date.now(), author: c.author,
        files: [...c.files],
        tree: newTree,
      });
      rs.created.push(newHash);
      rs.newParent = newHash;
      rs.todo.shift();
    }

    // Todos reaplicados: mover la rama y cerrar el rebase.
    const tip = rs.newParent;
    const total = rs.created.length;
    const target = rs.target;
    const suffix = rs.hadConflicts ? ' (conflictos resueltos)' : '';
    this.branches.set(rs.branch, tip);
    this.rebaseState = null;
    this._addReflog(this.HEAD, tip, `rebase finished: HEAD is now at ${tip}${suffix}`);
    return { ok: true, output: `Se han reaplicado ${total} commit(s) sobre ${target}.\nHEAD apunta a ${tip}.` };
  },

  _rebaseContinue() {
    const rs = this.rebaseState;
    if (!rs) return { ok: false, output: 'No hay ningún rebase en curso.' };
    this._setLast('rebase', ['--continue']);

    const unresolved = [...rs.conflicts].filter(
      (f) => !this.stagingArea.has(f) || hasConflictMarkers(this.stagingArea.get(f))
    );
    if (unresolved.length > 0) {
      return {
        ok: false,
        output: `Conflictos sin resolver en:\n${unresolved.map((f) => '  ' + f).join('\n')}\nEdita los archivos, quita los marcadores, y haz \`git add\` antes de continuar.`,
      };
    }

    // Crear el commit reaplicado con las resoluciones del staging.
    const c = this.commits.get(rs.todo[0]);
    const newTree = new Map(this._treeOf(rs.newParent));
    const changed = new Set();
    for (const [name, content] of this.stagingArea.entries()) {
      newTree.set(name, content);
      changed.add(name);
    }
    const newHash = generateHash();
    this.commits.set(newHash, {
      hash: newHash, message: c.message,
      parent: rs.newParent, secondParent: null,
      timestamp: Date.now(), author: c.author,
      files: [...changed],
      tree: newTree,
    });
    rs.created.push(newHash);
    rs.newParent = newHash;
    rs.todo.shift();
    rs.conflicts = new Set();
    this.stagingArea = new Map();
    return this._rebaseStep();
  },

  _rebaseAbort() {
    const rs = this.rebaseState;
    if (!rs) return { ok: false, output: 'No hay ningún rebase en curso.' };
    this._setLast('rebase', ['--abort']);
    // Los commits reaplicados a medias nunca llegaron a la rama: descartarlos.
    for (const h of rs.created) this.commits.delete(h);
    // Los archivos en conflicto vuelven a resolverse desde el tip de la rama
    // (el rebase exigió árbol limpio al empezar).
    for (const f of rs.conflicts) this.workingDirectory.delete(f);
    this.stagingArea = new Map();
    this.rebaseState = null;
    return { ok: true, output: 'Rebase abortado. Vuelves al estado anterior.' };
  },
};
