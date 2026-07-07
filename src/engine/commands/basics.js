import { generateHash } from '../../utils/hashGenerator.js';
import { parseIgnoreRules, matchesIgnore } from '../../utils/ignore.js';
import { hasConflictMarkers } from '../../utils/conflicts.js';

// ── Comandos básicos ──────────────────────────────────────────────────
// init, add, commit (y --amend), status y log, más `touch` (createFile).
// Se montan sobre GitEngine.prototype (ver GitEngine.js), por eso usan `this`.

export const basicCommands = {
  init() {
    this._setLast('init', []);
    if (this.initialized) return { ok: true, output: 'Repositorio Git ya inicializado en .git/' };
    this.initialized = true;
    this.branches.set('main', null);
    this.HEAD = 'main';
    this._addReflog('HEAD', null, 'git init');
    return { ok: true, output: 'Repositorio Git vacío inicializado en .git/' };
  },

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
      const dotConflicts = this.mergeState?.conflicts ?? this.rebaseState?.conflicts;
      if (dotConflicts) {
        const tree = this._currentTree();
        for (const f of dotConflicts) {
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
    const conflictSet = this.mergeState?.conflicts ?? this.rebaseState?.conflicts;
    for (const target of args) {
      if (this.workingDirectory.has(target)) {
        this.stagingArea.set(target, this.workingDirectory.get(target));
        this.workingDirectory.delete(target);
      } else if (conflictSet?.has(target) && !this.stagingArea.has(target)) {
        // Conflicto resuelto dejando la versión de HEAD: marcarlo como resuelto.
        this.stagingArea.set(target, tree.get(target) ?? '');
      }
      // Ya en staging o sin cambios respecto al commit: no-op, como git real.
    }
    return { ok: true, output: '' };
  },

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
  },

  commit(args) {
    if (!this.initialized) return this._notInit();
    if (this.rebaseState) {
      return {
        ok: false,
        output: 'Estás en medio de un rebase, no de un merge.\nResuelve los conflictos, haz `git add`, y continúa con `git rebase --continue` (o cancela con `git rebase --abort`).',
      };
    }
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
  },

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
  },

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

    if (this.rebaseState) {
      const current = this.commits.get(this.rebaseState.todo[0]);
      lines.push(`\nRebase en curso: reaplicando "${current?.message ?? '?'}" sobre ${this.rebaseState.target}.`);
      const unresolved = [...this.rebaseState.conflicts].filter(
        (f) => !this.stagingArea.has(f) || hasConflictMarkers(this.stagingArea.get(f))
      );
      if (unresolved.length) {
        lines.push('\nRutas no fusionadas:');
        lines.push('  (edita los archivos, resuelve los conflictos y haz `git add`)');
        unresolved.forEach((f) => lines.push(`  ambos modificados:   ${f}`));
      } else {
        lines.push('\nTodos los conflictos resueltos. Ejecuta `git rebase --continue`.');
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
      !this.rebaseState &&
      this.stagingArea.size === 0 &&
      modified.length === 0 &&
      untracked.length === 0
    ) {
      lines.push('\nNada que hacer commit, el árbol de trabajo está limpio');
    }
    return { ok: true, output: lines.join('\n') };
  },

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
  },

  // Reglas activas de .gitignore (se lee del working dir, staging o árbol actual).
  _ignoreRules() {
    const content =
      this.workingDirectory.get('.gitignore') ??
      this.stagingArea.get('.gitignore') ??
      this._currentTree().get('.gitignore');
    return parseIgnoreRules(content);
  },

  // Un archivo solo puede ignorarse si aún no está trackeado (como en git real).
  _isIgnored(name) {
    if (this.stagingArea.has(name) || this._currentTree().has(name)) return false;
    return matchesIgnore(name, this._ignoreRules());
  },
};
