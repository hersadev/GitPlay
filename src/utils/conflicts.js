// Utilidades para trabajar con marcadores de conflicto (<<<<<<< / ======= / >>>>>>>).
// Las usa el motor (para generar y validar) y el resolutor visual de conflictos.

// Genera los marcadores SOLO alrededor de la zona que difiere (prefijo y sufijo
// comunes fuera del conflicto), como hace git real hunk a hunk. Así el conflicto
// es legible y "conservar ambos" tiene sentido.
export function buildConflictMarkers(ours, theirs, ourLabel = 'HEAD', theirLabel = 'theirs') {
  const a = ours === '' ? [] : ours.split('\n');
  const b = theirs === '' ? [] : theirs.split('\n');

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  return [
    ...a.slice(0, start),
    `<<<<<<< ${ourLabel}`,
    ...a.slice(start, endA),
    '=======',
    ...b.slice(start, endB),
    `>>>>>>> ${theirLabel}`,
    ...a.slice(endA),
  ].join('\n');
}

export function hasConflictMarkers(content) {
  return typeof content === 'string' && /^<<<<<<< /m.test(content) && /^>>>>>>> /m.test(content);
}

// Divide el contenido en segmentos:
//   { type: 'text', lines: [...] }
//   { type: 'conflict', ours: [...], theirs: [...], oursLabel, theirsLabel }
export function parseConflictSegments(content) {
  const lines = (content ?? '').split('\n');
  const segments = [];
  let text = [];
  let i = 0;

  while (i < lines.length) {
    const open = lines[i].match(/^<<<<<<< (.*)$/);
    if (!open) {
      text.push(lines[i]);
      i++;
      continue;
    }
    // Buscar ======= y >>>>>>> que cierran este bloque.
    let sep = -1;
    let close = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (sep === -1 && lines[j] === '=======') sep = j;
      else if (sep !== -1 && /^>>>>>>> /.test(lines[j])) { close = j; break; }
    }
    if (sep === -1 || close === -1) {
      // Bloque malformado: tratarlo como texto normal.
      text.push(lines[i]);
      i++;
      continue;
    }
    if (text.length) {
      segments.push({ type: 'text', lines: text });
      text = [];
    }
    segments.push({
      type: 'conflict',
      oursLabel: open[1],
      theirsLabel: lines[close].replace(/^>>>>>>> /, ''),
      ours: lines.slice(i + 1, sep),
      theirs: lines.slice(sep + 1, close),
    });
    i = close + 1;
  }
  if (text.length) segments.push({ type: 'text', lines: text });
  return segments;
}

// Reconstruye el archivo aplicando una elección por conflicto:
// choices[k] ∈ 'ours' | 'theirs' | 'both' (k = índice del conflicto).
export function buildResolvedContent(segments, choices) {
  const out = [];
  let k = 0;
  for (const seg of segments) {
    if (seg.type === 'text') {
      out.push(...seg.lines);
      continue;
    }
    const choice = choices[k++];
    if (choice === 'ours') out.push(...seg.ours);
    else if (choice === 'theirs') out.push(...seg.theirs);
    else out.push(...seg.ours, ...seg.theirs); // 'both'
  }
  return out.join('\n');
}
