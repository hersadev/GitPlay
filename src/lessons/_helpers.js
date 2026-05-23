// Validadores reutilizables para las lecciones.
// Diseñados para evaluar el ESTADO del repo (no contadores arbitrarios),
// así una lección no depende de cuántos commits acumulados haya hecho el usuario.

export const initialized = (s) => s.initialized === true;

export const onBranch = (name) => (s) => s.HEAD === name;

export const hasBranch = (name) => (s) => s.branches.has(name);

export const hasTag = (name) => (s) => s.tags.has(name);

export const lastCmd = (cmd) => (s) => s.lastCommand?.command === cmd;

export const lastArg = (cmd, arg) => (s) =>
  s.lastCommand?.command === cmd && s.lastCommand?.args?.includes(arg);

// ¿Existe en el grafo algún commit (ancestro o huérfano) con este archivo?
export const hasFileAnywhere = (file) => (s) =>
  [...s.commits.values()].some((c) => c.files.includes(file));

// ¿Existe en la historia activa de esa rama un commit con este archivo?
export const fileOnBranch = (file, branch) => (s) => {
  if (!s.branches.has(branch)) return false;
  let cur = s.branches.get(branch);
  while (cur) {
    const c = s.commits.get(cur);
    if (!c) return false;
    if (c.files.includes(file)) return true;
    cur = c.parent;
  }
  return false;
};

// La rama existe pero el archivo NO está en su historia activa (útil tras un reset --hard).
export const fileNotOnBranch = (file, branch) => (s) =>
  s.branches.has(branch) && !fileOnBranch(file, branch)(s);

// ¿Algún commit cumple la condición sobre su mensaje?
export const commitMsgMatches = (regex) => (s) =>
  [...s.commits.values()].some((c) => regex.test(c.message));

// ¿Algún commit en la historia activa de esta rama es un merge (tiene secondParent)?
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
