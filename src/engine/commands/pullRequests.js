import { generateHash } from '../../utils/hashGenerator.js';

// ── Pull Requests ─────────────────────────────────────────────────────
// API para que la UI (GitHubView) cree/mergee/cierre PRs; no son comandos git.
// Se montan sobre GitEngine.prototype (ver GitEngine.js), por eso usan `this`.

export const pullRequestMethods = {
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
  },

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
      // Merge commit en el remoto, con 3 vías de verdad (base común, into, from):
      // solo se aplican los cambios del PR respecto a la base, para no pisar los
      // avances de la rama destino con copias viejas de la rama del PR.
      const baseHash = this._findCommonAncestor(intoHash, fromHash, this.remoteCommits);
      const baseTree = baseHash ? this.remoteCommits.get(baseHash)?.tree ?? new Map() : new Map();
      const intoTree = this.remoteCommits.get(intoHash)?.tree ?? new Map();
      const fromTree = this.remoteCommits.get(fromHash)?.tree ?? new Map();
      const mergedTree = new Map(intoTree);
      const conflicts = [];
      const allFiles = new Set([...intoTree.keys(), ...fromTree.keys(), ...baseTree.keys()]);
      for (const f of allFiles) {
        const base = baseTree.get(f);
        const ours = intoTree.get(f);    // rama destino
        const theirs = fromTree.get(f);  // rama del PR
        if (ours === theirs) continue;   // idéntico (o ausente) en ambos lados
        if (theirs === base) continue;   // solo cambió la rama destino: se conserva
        if (ours === base) {             // solo cambió el PR: aplicar su versión
          if (theirs === undefined) mergedTree.delete(f);
          else mergedTree.set(f, theirs);
          continue;
        }
        conflicts.push(f);               // ambos divergen: GitHub bloquearía el merge
      }
      if (conflicts.length) {
        return {
          ok: false,
          output: `El PR #${pr.id} tiene conflictos con ${pr.into} en: ${conflicts.join(', ')}.\nEn local: actualiza ${pr.into} (git pull), mergea ${pr.into} en ${pr.from}, resuelve los conflictos y pushea. Después reintenta.`,
        };
      }
      const mergeHash = generateHash();
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
  },

  closePullRequest(prId) {
    const pr = this.pullRequests.find((p) => p.id === prId);
    if (!pr) return { ok: false, output: `PR #${prId} no encontrado.` };
    if (pr.state !== 'open') return { ok: false, output: `El PR #${prId} ya está ${pr.state}.` };
    pr.state = 'closed';
    pr.closedAt = Date.now();
    return { ok: true, output: `PR #${pr.id} cerrado sin merge.` };
  },
};
