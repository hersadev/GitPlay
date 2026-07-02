// Validadores reutilizables para las lecciones.
// Evalúan ESTADO (no contadores), así una lección no depende de cuántos commits previos haya.

export const initialized = (s) => s.initialized === true;

export const onBranch = (name) => (s) => s.HEAD === name;

export const hasBranch = (name) => (s) => s.branches.has(name);

export const hasTag = (name) => (s) => s.tags.has(name);

export const lastCmd = (cmd) => (s) => s.lastCommand?.command === cmd;

export const lastArg = (cmd, arg) => (s) =>
  s.lastCommand?.command === cmd && s.lastCommand?.args?.includes(arg);

// Busca el archivo en el árbol (snapshot) de cualquier commit del grafo.
// Compat: si un commit antiguo no tiene `tree`, cae a `files`.
export const hasFileAnywhere = (file) => (s) =>
  [...s.commits.values()].some((c) =>
    (c.tree && c.tree.has?.(file)) || c.files?.includes?.(file)
  );

// El archivo está en el árbol del tip de esta rama (= existe en esa rama hoy).
export const fileOnBranch = (file, branch) => (s) => {
  if (!s.branches.has(branch)) return false;
  const tipHash = s.branches.get(branch);
  if (!tipHash) return false;
  const tipCommit = s.commits.get(tipHash);
  if (tipCommit?.tree?.has?.(file)) return true;
  // Fallback compat: caminar historia.
  let cur = tipHash;
  while (cur) {
    const c = s.commits.get(cur);
    if (!c) return false;
    if (c.files?.includes?.(file)) return true;
    cur = c.parent;
  }
  return false;
};

// La rama existe pero el archivo NO está en su árbol (útil tras reset --hard o revert).
export const fileNotOnBranch = (file, branch) => (s) =>
  s.branches.has(branch) && !fileOnBranch(file, branch)(s);

// ¿Algún commit cumple la condición sobre su mensaje?
export const commitMsgMatches = (regex) => (s) =>
  [...s.commits.values()].some((c) => regex.test(c.message));

// ¿Algún commit en la historia activa de esta rama es un merge?
export const hasMergeInBranch = (branch) => (s) => {
  if (!s.branches.has(branch)) return false;
  let cur = s.branches.get(branch);
  while (cur) {
    const c = s.commits.get(cur);
    if (!c) return false;
    if (c.secondParent) return true;
    cur = c.parent;
  }
  return false;
};

// HEAD desacoplado: apunta a un hash de commit en lugar de a una rama.
export const isDetached = (s) =>
  !s.branches.has(s.HEAD) && s.commits.has(s.HEAD);

// ── Validadores para GitHub / remoto ──────────────────────────────────

// La rama existe en el remoto (alguien la pusheó).
export const branchOnRemote = (name) => (s) =>
  !!s.remoteBranches?.has?.(name);

// La rama local y la remota apuntan al mismo commit.
export const branchSynced = (name) => (s) =>
  s.branches?.get?.(name) && s.remoteBranches?.get?.(name) === s.branches?.get?.(name);

// El cliente conoce la ref origin/<branch> (= ha hecho fetch al menos una vez).
export const hasRemoteRef = (branch) => (s) =>
  !!s.remoteRefs?.has?.(`origin/${branch}`);

// Hay un PR abierto con esta combinación.
export const hasOpenPR = (from, into) => (s) =>
  (s.pullRequests ?? []).some(
    (p) => p.state === 'open' && p.from === from && (!into || p.into === into)
  );

// Hay un PR mergeado con esta combinación.
export const hasMergedPR = (from, into) => (s) =>
  (s.pullRequests ?? []).some(
    (p) => p.state === 'merged' && p.from === from && (!into || p.into === into)
  );

// Hay al menos un PR (en cualquier estado).
export const hasAnyPR = (s) => (s.pullRequests ?? []).length > 0;

// El estado del repo NO tiene mergeState activo (= conflictos resueltos).
export const mergeResolved = (s) => !s.mergeState;

// Hay un rebase pausado (normalmente por conflictos).
export const rebaseInProgress = (s) => !!s.rebaseState;

// El contenido del archivo en el tip de la rama cumple el patrón.
export const branchFileMatches = (branch, file, regex) => (s) => {
  const tip = s.branches.get(branch);
  const content = tip ? s.commits.get(tip)?.tree?.get?.(file) : undefined;
  return typeof content === 'string' && regex.test(content);
};

// La rama quedó rebaseada sobre `base`: el tip de base está en la cadena de
// primeros padres del tip de branch. Un merge NO cumple esto (la otra rama
// entra por el segundo padre), así que distingue rebase de merge.
export const rebasedOnto = (branch, base) => (s) => {
  const baseTip = s.branches.get(base);
  if (!baseTip) return false;
  let cur = s.branches.get(branch);
  while (cur) {
    if (cur === baseTip) return true;
    cur = s.commits.get(cur)?.parent ?? null;
  }
  return false;
};
