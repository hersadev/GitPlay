const H_SPACING_MAX = 130;
const H_SPACING_MIN = 80;
const V_SPACING = 90;
const OFFSET_X = 80;
const OFFSET_Y = 80;

// El grafo se ensancha a medida que avanza el curso: comprimimos el espaciado
// horizontal según el nº de commits para que no crezca sin control.
function horizontalSpacing(count) {
  if (count <= 6) return H_SPACING_MAX;
  return Math.max(H_SPACING_MIN, H_SPACING_MAX - (count - 6) * 5);
}

export function computeLayout(commits, branches) {
  if (!commits.size) return new Map();

  // Oldest commit → leftmost column
  const sorted = [...commits.values()].sort((a, b) =>
    a.timestamp !== b.timestamp ? a.timestamp - b.timestamp : a.hash.localeCompare(b.hash)
  );
  const xIndex = new Map(sorted.map((c, i) => [c.hash, i]));
  const H_SPACING = horizontalSpacing(sorted.length);

  // Assign rows: walk each branch tip → root, main branch first
  const rows = new Map();
  const branchOrder = [...branches.keys()].sort((a, b) =>
    a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)
  );
  let nextRow = 0;

  for (const name of branchOrder) {
    const tip = branches.get(name);
    if (!tip) continue;
    let hash = tip;
    while (hash) {
      if (rows.has(hash)) break;
      rows.set(hash, nextRow);
      hash = commits.get(hash)?.parent ?? null;
    }
    nextRow++;
  }

  // Any remaining (detached HEAD commits, etc.)
  sorted.forEach((c) => {
    if (!rows.has(c.hash)) rows.set(c.hash, nextRow++);
  });

  const positions = new Map();
  sorted.forEach((c) => {
    positions.set(c.hash, {
      x: xIndex.get(c.hash) * H_SPACING + OFFSET_X,
      y: rows.get(c.hash) * V_SPACING + OFFSET_Y,
      // Columna cronológica: la vista la usa para escalonar los títulos
      // de los commits en dos alturas y que no se pisen entre vecinos.
      col: xIndex.get(c.hash),
    });
  });

  return positions;
}

// Asigna un "piso" (level) a cada etiqueta de rama/ref para que las de
// commits vecinos de la misma fila no se solapen: barrido izquierda→derecha
// reservando en cada piso el hueco horizontal ya ocupado.
// items: [{ hash, pos: {x, y}, textWidth, ... }] — se devuelve mutado con
// `level` y `isStackBase` (la etiqueta más baja de la pila de su commit).
export function layoutRefLabels(items, gap = 8) {
  items.sort((a, b) => (a.pos.y - b.pos.y) || (a.pos.x - b.pos.x));
  let rowY = null;
  let levelEnds = []; // fin (x) de la última etiqueta colocada en cada piso
  for (const it of items) {
    if (it.pos.y !== rowY) {
      rowY = it.pos.y;
      levelEnds = [];
    }
    const start = it.pos.x - it.textWidth / 2;
    let level = 0;
    while (level < levelEnds.length && start < levelEnds[level] + gap) level++;
    levelEnds[level] = it.pos.x + it.textWidth / 2;
    it.level = level;
  }
  const minLevel = new Map();
  for (const it of items) {
    minLevel.set(it.hash, Math.min(minLevel.get(it.hash) ?? Infinity, it.level));
  }
  for (const it of items) it.isStackBase = it.level === minLevel.get(it.hash);
  return items;
}

export function svgDimensions(positions) {
  if (!positions.size) return { width: 400, height: 200 };
  let maxX = 0;
  let maxY = 0;
  positions.forEach(({ x, y }) => {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return { width: maxX + OFFSET_X, height: maxY + OFFSET_Y };
}
