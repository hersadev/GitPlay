// ── Remoto "origin" ───────────────────────────────────────────────────
// push, fetch, pull y clone contra el remoto simulado.
// Se montan sobre GitEngine.prototype (ver GitEngine.js), por eso usan `this`.

export const remoteCommands = {
  push(args) {
    if (!this.initialized) return this._notInit();
    this._setLast('push', args);

    // git push [-u|--set-upstream] [origin] [rama]
    const flags = args.filter((a) => a.startsWith('-'));
    const desconocidos = flags.filter((a) => a !== '-u' && a !== '--set-upstream');
    if (desconocidos.length) {
      return {
        ok: false,
        output: `error: opción '${desconocidos[0]}' no soportada en el simulador.\nUso: git push [-u] [origin] [<rama>]`,
      };
    }
    const setUpstream = flags.length > 0;
    const filtered = args.filter((a) => a !== 'origin' && !a.startsWith('-'));
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
    const tracking = setUpstream
      ? `\nLa rama '${branchArg}' quedó configurada para seguir a 'origin/${branchArg}'.`
      : '';
    return { ok: true, output: `To origin\n   ${summary}${tracking}` };
  },

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
  },

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
    // Como git real: el fetch ya se hizo, pero el merge del pull aborta antes
    // de pisar cambios locales sin commitear (también en fast-forward).
    const pisados = this._localChangesOverwrittenBy(localHash, remoteHash);
    if (pisados.length) {
      return { ok: false, output: `${fetched.output}\n${this._overwrittenByMergeError(pisados).output}` };
    }
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
  },

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
  },
};
