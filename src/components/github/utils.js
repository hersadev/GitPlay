// Utilidades compartidas por las pestañas de la vista GitHub.

export const DEFAULT_BRANCH = 'main';

export function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'hace unos segundos';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d !== 1 ? 's' : ''}`;
}

export function collectAncestors(hash, commitsMap) {
  const seen = new Set();
  const stack = [hash];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    const c = commitsMap.get(cur);
    if (c) stack.push(c.parent, c.secondParent);
  }
  return seen;
}

export function aheadBehind(tip, baseTip, commitsMap) {
  const a = collectAncestors(tip, commitsMap);
  const b = collectAncestors(baseTip, commitsMap);
  let ahead = 0;
  let behind = 0;
  a.forEach((h) => { if (!b.has(h)) ahead++; });
  b.forEach((h) => { if (!a.has(h)) behind++; });
  return { ahead, behind };
}
