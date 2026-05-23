const H_SPACING = 130;
const V_SPACING = 80;
const OFFSET_X = 80;
const OFFSET_Y = 80;

export function computeLayout(commits, branches) {
  if (!commits.size) return new Map();

  // Oldest commit → leftmost column
  const sorted = [...commits.values()].sort((a, b) =>
    a.timestamp !== b.timestamp ? a.timestamp - b.timestamp : a.hash.localeCompare(b.hash)
  );
  const xIndex = new Map(sorted.map((c, i) => [c.hash, i]));

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
    });
  });

  return positions;
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
