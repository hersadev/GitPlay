// ── Ramas ─────────────────────────────────────────────────────────────
// branch, checkout y switch (con su helper _switchTo compartido).
// Se montan sobre GitEngine.prototype (ver GitEngine.js), por eso usan `this`.

export const branchingCommands = {
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
      // -d solo borra ramas ya integradas (alcanzables desde HEAD); -D fuerza.
      if (args[0] === '-d' && !this._isAncestor(this.branches.get(name), this._currentCommitHash())) {
        return { ok: false, output: `error: la rama '${name}' no está completamente fusionada.\nSi estás seguro de que quieres borrarla, ejecuta 'git branch -D ${name}'.` };
      }
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
  },

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
  },

  switch(args) {
    if (!this.initialized) return this._notInit();
    if (!args.length) return { ok: false, output: 'Uso: git switch <rama>\n       git switch -c <rama>\n       git switch --detach <hash>' };
    this._setLast('switch', args);
    if (args[0] === '-c') {
      const name = args[1];
      if (!name) return { ok: false, output: 'Uso: git switch -c <rama>' };
      const r = this.branch([name]);
      if (!r.ok) return r;
      return this._switchTo(name);
    }
    // A diferencia de checkout, switch solo acepta ramas: moverse a un commit
    // (HEAD desacoplado) hay que pedirlo explícitamente con --detach.
    if (args[0] === '--detach' || args[0] === '-d') {
      const hash = this._resolveRef(args[1]);
      if (!hash) return { ok: false, output: `fatal: referencia inválida: ${args[1] ?? 'HEAD'}` };
      return this._switchTo(hash);
    }
    const target = args[0];
    if (!this.branches.has(target)) {
      if (this.tags.has(target)) {
        return { ok: false, output: `fatal: se esperaba una rama, se obtuvo el tag '${target}'.\nPara inspeccionarlo con HEAD desacoplado: git switch --detach ${target}` };
      }
      if (this._findCommit(target)) {
        return { ok: false, output: `fatal: se esperaba una rama, se obtuvo el commit '${target}'.\nPara inspeccionarlo con HEAD desacoplado: git switch --detach ${target}` };
      }
      return { ok: false, output: `fatal: referencia inválida: ${target}` };
    }
    return this._switchTo(target);
  },

  _switchTo(target) {
    if (this.rebaseState) {
      return { ok: false, output: 'No puedes cambiar de rama en medio de un rebase.\nTermínalo con `git rebase --continue` o cancélalo con `git rebase --abort`.' };
    }
    if (this.mergeState) {
      return { ok: false, output: 'No puedes cambiar de rama en medio de un merge con conflictos.\nResuélvelos y commitea, o cancela con `git merge --abort`.' };
    }
    const prev = this.HEAD;
    if (this.branches.has(target)) {
      this.HEAD = target;
      this._addReflog('HEAD', this.branches.get(target), `checkout: moverse de ${prev} a ${target}`);
      return { ok: true, output: `Cambiado a rama '${target}'` };
    }
    // Un tag lleva a su commit con HEAD desacoplado, como en git real.
    if (this.tags.has(target)) {
      const tagHash = this.tags.get(target);
      this.HEAD = tagHash;
      this._addReflog('HEAD', tagHash, `checkout: moverse a ${target} (HEAD desacoplado)`);
      return { ok: true, output: `HEAD desacoplado en ${tagHash} (tag '${target}')` };
    }
    // Acepta hash completo o abreviado (prefijo).
    const hash = this._findCommit(target);
    if (hash) {
      this.HEAD = hash;
      this._addReflog('HEAD', hash, `checkout: moverse a ${hash} (HEAD desacoplado)`);
      return { ok: true, output: `HEAD desacoplado en ${hash}` };
    }
    return { ok: false, output: `error: pathspec '${target}' no coincide con ningún archivo o rama conocida.` };
  },
};
