import { useMemo, useState } from 'react';
import { parseConflictSegments, buildResolvedContent } from '../../utils/conflicts';

// Resolutor visual de conflictos al estilo VSCode: el archivo se ve como
// código normal (con números de línea y los marcadores <<<<<<< / ======= /
// >>>>>>> visibles) y, encima de cada conflicto, una fila de acciones para
// aceptar el cambio actual, el entrante o ambos — sin editar a mano.

const CHOICE_LABEL = {
  ours: 'el cambio actual',
  theirs: 'el cambio entrante',
  both: 'ambos cambios',
};

const TONE_CLASS = {
  context: 'text-gray-300',
  ours: 'bg-emerald-900/30 text-emerald-50',
  oursMarker: 'bg-emerald-800/50 text-emerald-300',
  theirs: 'bg-sky-900/30 text-sky-50',
  theirsMarker: 'bg-sky-800/50 text-sky-300',
  sep: 'bg-gray-800/60 text-gray-500',
  resolved: 'text-gray-100 bg-green-950/20',
};

// Una línea de código con su número, como en un editor.
function CodeLine({ lineNo, text, tone, note }) {
  return (
    <div className={`flex ${TONE_CLASS[tone]}`}>
      <span className="select-none text-gray-600 w-12 text-right pr-3 flex-shrink-0">
        {lineNo}
      </span>
      <span className="whitespace-pre-wrap break-all flex-1">
        {text || ' '}
        {note && (
          <span className="select-none italic text-[11px] opacity-70 ml-3">({note})</span>
        )}
      </span>
    </div>
  );
}

// Fila de acciones tipo CodeLens de VSCode, encima de cada conflicto.
function LensAction({ onClick, children, className = 'text-blue-400 hover:text-blue-300' }) {
  return (
    <button onClick={onClick} className={`hover:underline ${className}`}>
      {children}
    </button>
  );
}

export default function ConflictResolver({ content, sides, onApply, onEditManually }) {
  const segments = useMemo(() => parseConflictSegments(content), [content]);
  const conflictCount = segments.filter((s) => s.type === 'conflict').length;
  const [choices, setChoices] = useState({});

  const resolvedCount = Object.values(choices).filter(Boolean).length;
  const allResolved = resolvedCount === conflictCount;

  function choose(k, c) {
    setChoices((prev) => ({ ...prev, [k]: c }));
  }

  function apply(markResolved) {
    const ordered = [];
    let k = 0;
    for (const seg of segments) {
      if (seg.type === 'conflict') ordered.push(choices[k++]);
    }
    onApply(buildResolvedContent(segments, ordered), markResolved);
  }

  // Aplana los segmentos en filas renderizables: código numerado y filas
  // de acciones (sin número), reflejando el estado actual de cada conflicto.
  const rows = [];
  let k = -1;
  for (const seg of segments) {
    if (seg.type === 'text') {
      for (const text of seg.lines) rows.push({ kind: 'code', text, tone: 'context' });
      continue;
    }
    k++;
    const choice = choices[k];
    if (choice) {
      rows.push({ kind: 'lens-resolved', k, choice });
      const lines =
        choice === 'ours' ? seg.ours
        : choice === 'theirs' ? seg.theirs
        : [...seg.ours, ...seg.theirs];
      if (lines.length === 0) rows.push({ kind: 'empty-note' });
      for (const text of lines) rows.push({ kind: 'code', text, tone: 'resolved' });
    } else {
      rows.push({ kind: 'lens', k });
      rows.push({ kind: 'code', text: `<<<<<<< ${seg.oursLabel}`, tone: 'oursMarker', note: `Cambio actual · ${sides.ours}` });
      for (const text of seg.ours) rows.push({ kind: 'code', text, tone: 'ours' });
      rows.push({ kind: 'code', text: '=======', tone: 'sep' });
      for (const text of seg.theirs) rows.push({ kind: 'code', text, tone: 'theirs' });
      rows.push({ kind: 'code', text: `>>>>>>> ${seg.theirsLabel}`, tone: 'theirsMarker', note: `Cambio entrante · ${sides.theirs}` });
    }
  }

  let lineNo = 0;
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto bg-gray-950 py-2 text-sm font-mono leading-relaxed">
        {rows.map((row, i) => {
          if (row.kind === 'code') {
            lineNo++;
            return <CodeLine key={i} lineNo={lineNo} text={row.text} tone={row.tone} note={row.note} />;
          }
          if (row.kind === 'lens') {
            return (
              <div key={i} className="flex select-none">
                <span className="w-12 flex-shrink-0" />
                <div className="text-[11px] font-sans py-0.5 flex items-center gap-2 text-gray-500">
                  <LensAction onClick={() => choose(row.k, 'ours')}>Aceptar el cambio actual</LensAction>
                  <span>|</span>
                  <LensAction onClick={() => choose(row.k, 'theirs')}>Aceptar el cambio entrante</LensAction>
                  <span>|</span>
                  <LensAction onClick={() => choose(row.k, 'both')}>Aceptar ambos cambios</LensAction>
                </div>
              </div>
            );
          }
          if (row.kind === 'lens-resolved') {
            return (
              <div key={i} className="flex select-none">
                <span className="w-12 flex-shrink-0" />
                <div className="text-[11px] font-sans py-0.5 flex items-center gap-2">
                  <span className="text-green-400">
                    ✓ Conflicto {row.k + 1} resuelto: aceptaste {CHOICE_LABEL[row.choice]}
                  </span>
                  <span className="text-gray-600">|</span>
                  <LensAction onClick={() => choose(row.k, null)} className="text-gray-400 hover:text-white">
                    Deshacer
                  </LensAction>
                </div>
              </div>
            );
          }
          // empty-note: la elección deja la zona sin líneas
          return (
            <div key={i} className="flex select-none">
              <span className="w-12 flex-shrink-0" />
              <span className="italic text-xs text-gray-600 py-0.5">(se eliminaron las líneas)</span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 bg-gray-850 border-t border-gray-700 flex items-center gap-3 flex-wrap">
        <span className={`text-xs ${allResolved ? 'text-green-400' : 'text-orange-300'}`}>
          {allResolved
            ? '✓ Todos los conflictos resueltos'
            : `${resolvedCount}/${conflictCount} conflicto${conflictCount !== 1 ? 's' : ''} resuelto${resolvedCount !== 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {onEditManually && (
            <button
              onClick={onEditManually}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded"
            >
              Editar a mano
            </button>
          )}
          <button
            onClick={() => apply(false)}
            disabled={!allResolved}
            className={`text-xs px-2 py-1 rounded border ${
              allResolved
                ? 'text-gray-300 border-gray-600 hover:bg-gray-800'
                : 'text-gray-600 border-gray-800 cursor-not-allowed'
            }`}
          >
            Solo guardar
          </button>
          <button
            onClick={() => apply(true)}
            disabled={!allResolved}
            className={`text-xs px-2.5 py-1 rounded border font-semibold ${
              allResolved
                ? 'text-green-200 border-green-700 bg-green-900/50 hover:bg-green-900'
                : 'text-gray-600 border-gray-800 cursor-not-allowed'
            }`}
            title="Guarda el archivo y ejecuta git add por ti"
          >
            ✓ Guardar y marcar resuelto (git add)
          </button>
        </div>
      </div>
    </div>
  );
}
