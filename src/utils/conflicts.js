// Utilidades para trabajar con marcadores de conflicto (<<<<<<< / ======= / >>>>>>>).
// Las usa el motor (para validar) y el resolutor visual de conflictos.

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
