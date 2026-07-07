import { generateHash } from '../utils/hashGenerator.js';

// ── API pública para lecciones ────────────────────────────────────────
// Métodos de setup que usan las lecciones para preparar el escenario
// (archivos, commits previos, trabajo "de un compañero" en el remoto…).
// Se montan sobre GitEngine.prototype (ver GitEngine.js), por eso usan `this`.

export const seedMethods = {
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
  },

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
  },

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
  },

  // Crea un commit directamente sobre una rama LOCAL (setup de lecciones:
  // simular trabajo previo tuyo o de un compañero). No toca HEAD, staging
  // ni working directory. Idempotente: si el tip ya tiene ese mensaje, no hace nada.
  seedLocalCommit(branch, { message, files, author = 'compañero' }) {
    if (!this.initialized || !this.branches.has(branch)) return;
    const parentHash = this.branches.get(branch);
    if (parentHash && this.commits.get(parentHash)?.message === message) return;
    const parentTree = parentHash ? this._treeOf(parentHash) : new Map();
    const newTree = new Map(parentTree);
    const changedFiles = [];
    for (const [name, content] of Object.entries(files)) {
      newTree.set(name, content);
      changedFiles.push(name);
    }
    const hash = generateHash();
    this.commits.set(hash, {
      hash, message,
      parent: parentHash, secondParent: null,
      timestamp: Date.now(), author,
      files: changedFiles, tree: newTree,
    });
    this.branches.set(branch, hash);
  },

  // Crea una rama local apuntando al tip de otra (setup de lecciones, idempotente).
  seedBranch(name, from = 'main') {
    if (!this.initialized || this.branches.has(name)) return;
    const hash = this.branches.get(from);
    if (!hash) return;
    this.branches.set(name, hash);
  },
};
