import { useMemo, useState } from 'react';
import { parseConflictSegments, buildResolvedContent } from '../../utils/conflicts';

// Resolutor visual de conflictos: muestra los bloques <<<<<<< / ======= / >>>>>>>
// con colores y botones para elegir qué conservar (lo tuyo, lo del otro, o ambos),
// sin tener que editar los marcadores a mano.

const CHOICE_LABEL = {
  ours: 'la primera versión',
  theirs: 'la segunda versión',
  both: 'ambas versiones',
};

function Lines({ lines, tone }) {
  const toneClass = {
    ours: 'bg-green-950/60 text-green-100',
    theirs: 'bg-blue-950/60 text-blue-100',
    context: 'text-gray-400',
    resolved: 'bg-gray-800/80 text-gray-100',
  }[tone];
  if (!lines.length) {
    return (
      <div className={`px-3 py-1 italic text-xs ${tone === 'context' ? 'text-gray-600' : toneClass}`}>
        (sin líneas: esta versión deja la zona vacía)
      </div>
    );
  }
  return lines.map((line, i) => (
    <div key={i} className={`px-3 whitespace-pre-wrap break-all leading-relaxed ${toneClass}`}>
      {line || ' '}
    </div>
  ));
}

function ConflictBlock({ index, total, segment, sides, choice, onChoose }) {
  if (choice) {
    const lines =
      choice === 'ours' ? segment.ours
      : choice === 'theirs' ? segment.theirs
      : [...segment.ours, ...segment.theirs];
    return (
      <div className="my-1 rounded-md border border-green-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1 bg-green-900/40 text-xs">
          <span className="text-green-300">
            ✓ Conflicto {index + 1} resuelto — conservaste {CHOICE_LABEL[choice]}
          </span>
          <button
            onClick={() => onChoose(null)}
            className="text-gray-400 hover:text-white underline decoration-dotted"
          >
            ↩ cambiar
          </button>
        </div>
        <Lines lines={lines} tone="resolved" />
      </div>
    );
  }

  return (
    <div className="my-1 rounded-md border border-orange-700 overflow-hidden">
      <div className="px-3 py-1 bg-orange-900/40 text-xs text-orange-200 font-semibold">
        ⚡ Conflicto {index + 1} de {total} — elige qué conservar
      </div>

      {/* Lado "ours" */}
      <div className="flex items-center justify-between px-3 py-1 bg-green-900/30 border-t border-green-900">
        <span className="text-[11px] font-mono text-green-400 truncate">
          {'<'.repeat(7)} {segment.oursLabel}
          <span className="font-sans text-green-200 ml-2">· {sides.ours}</span>
        </span>
        <button
          onClick={() => onChoose('ours')}
          className="text-[11px] flex-shrink-0 ml-2 px-2 py-0.5 rounded border border-green-700 text-green-300 hover:bg-green-900/60"
        >
          Conservar solo esto
        </button>
      </div>
      <Lines lines={segment.ours} tone="ours" />

      <div className="px-3 text-[11px] font-mono text-gray-500 bg-gray-900 border-y border-gray-800">
        =======
      </div>

      {/* Lado "theirs" */}
      <Lines lines={segment.theirs} tone="theirs" />
      <div className="flex items-center justify-between px-3 py-1 bg-blue-900/30 border-t border-blue-900">
        <span className="text-[11px] font-mono text-blue-400 truncate">
          {'>'.repeat(7)} {segment.theirsLabel}
          <span className="font-sans text-blue-200 ml-2">· {sides.theirs}</span>
        </span>
        <button
          onClick={() => onChoose('theirs')}
          className="text-[11px] flex-shrink-0 ml-2 px-2 py-0.5 rounded border border-blue-700 text-blue-300 hover:bg-blue-900/60"
        >
          Conservar solo esto
        </button>
      </div>

      <div className="px-3 py-1.5 bg-gray-900 border-t border-gray-800 flex justify-center">
        <button
          onClick={() => onChoose('both')}
          className="text-[11px] px-3 py-1 rounded border border-purple-700 text-purple-300 hover:bg-purple-900/50"
        >
          ✓✓ Conservar ambos (primero uno, después el otro)
        </button>
      </div>
    </div>
  );
}

export default function ConflictResolver({ content, sides, onApply, onEditManually }) {
  const segments = useMemo(() => parseConflictSegments(content), [content]);
  const conflictCount = segments.filter((s) => s.type === 'conflict').length;
  const [choices, setChoices] = useState({});

  const resolvedCount = Object.values(choices).filter(Boolean).length;
  const allResolved = resolvedCount === conflictCount;

  function apply(markResolved) {
    const ordered = [];
    let k = 0;
    for (const seg of segments) {
      if (seg.type === 'conflict') ordered.push(choices[k++]);
    }
    onApply(buildResolvedContent(segments, ordered), markResolved);
  }

  let conflictIdx = -1;
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto bg-gray-950 py-2 text-sm font-mono">
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <Lines key={i} lines={seg.lines} tone="context" />;
          conflictIdx++;
          const k = conflictIdx;
          return (
            <ConflictBlock
              key={i}
              index={k}
              total={conflictCount}
              segment={seg}
              sides={sides}
              choice={choices[k]}
              onChoose={(c) => setChoices((prev) => ({ ...prev, [k]: c }))}
            />
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
