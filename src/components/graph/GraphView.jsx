import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeLayout, svgDimensions } from '../../utils/graphLayout';

const BRANCH_PALETTE = [
  '#b8bb26', // verde oliva — main
  '#83a598', // azul
  '#d3869b', // púrpura
  '#fe8019', // naranja
  '#8ec07c', // aqua
  '#fabd2f', // amarillo
];

const NODE_R = 18;

function edgePath(x1, y1, x2, y2) {
  if (y1 === y2) {
    return `M ${x1 + NODE_R} ${y1} L ${x2 - NODE_R} ${y2}`;
  }
  const cx1 = x1 + NODE_R + 40;
  const cx2 = x2 - NODE_R - 40;
  return `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`;
}

function CommitDetail({ commit, branches, tags, HEAD, onClose, onOpenFile }) {
  const branchesHere = [...branches.entries()].filter(([, h]) => h === commit.hash).map(([n]) => n);
  const tagsHere = [...tags.entries()].filter(([, h]) => h === commit.hash).map(([n]) => n);
  const date = new Date(commit.timestamp).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-4 right-4 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl text-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-750 border-b border-gray-700">
        <span className="font-mono text-xs text-gray-400">commit {commit.hash}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Message */}
        <p className="text-white font-medium leading-snug break-words">{commit.message}</p>

        {/* Meta */}
        <p className="text-xs text-gray-400">
          <span className="text-gray-300">{commit.author}</span>
          <span className="mx-1">·</span>
          {date}
        </p>

        {/* Branches */}
        {branchesHere.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {branchesHere.map((n) => (
              <span
                key={n}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${n === HEAD ? 'bg-green-700 text-green-100' : 'bg-blue-900/70 text-blue-300 border border-blue-700'}`}
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {tagsHere.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tagsHere.map((n) => (
              <span key={n} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-900/70 text-purple-300 border border-purple-700">
                ◆ {n}
              </span>
            ))}
          </div>
        )}

        {/* Files */}
        {commit.files?.length > 0 && (
          <div>
            <p className="text-[10px] uppercase text-gray-500 tracking-wider mb-1">
              {commit.files.length} archivo{commit.files.length !== 1 ? 's' : ''}
            </p>
            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
              {commit.files.map((f) => (
                <li key={f} className="flex items-center gap-1 text-xs font-mono">
                  <span className="text-green-500">+</span>
                  <button
                    onClick={() => onOpenFile?.({ name: f, source: 'commit', hash: commit.hash })}
                    className="text-green-300 hover:text-green-200 hover:underline text-left truncate"
                  >
                    {f}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BranchLegend({ branchColor, HEAD }) {
  if (branchColor.size <= 1) return null;
  return (
    <div className="absolute top-3 right-3 bg-gray-900/80 border border-gray-700 rounded-md px-2 py-1.5 flex flex-col gap-1 backdrop-blur-sm">
      {[...branchColor.entries()].map(([name, color]) => (
        <div key={name} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className={`text-[10px] font-mono ${name === HEAD ? 'text-white font-semibold' : 'text-gray-400'}`}>
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GraphView({ commits, branches, tags = new Map(), remoteRefs = new Map(), HEAD, onOpenFile }) {
  const [selectedHash, setSelectedHash] = useState(null);

  const positions = useMemo(() => computeLayout(commits, branches), [commits, branches]);
  const { width, height } = useMemo(() => svgDimensions(positions), [positions]);

  const branchColor = useMemo(() => {
    const order = [...branches.keys()].sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : 0));
    const map = new Map();
    order.forEach((name, i) => map.set(name, BRANCH_PALETTE[i % BRANCH_PALETTE.length]));
    return map;
  }, [branches]);

  const nodeColor = useMemo(() => {
    const map = new Map();
    const order = [...branches.keys()].sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : 0));
    for (const name of order) {
      const color = branchColor.get(name);
      let hash = branches.get(name);
      while (hash) {
        if (map.has(hash)) break;
        map.set(hash, color);
        hash = commits.get(hash)?.parent ?? null;
      }
    }
    commits.forEach((_, h) => { if (!map.has(h)) map.set(h, '#928374'); });
    return map;
  }, [commits, branches, branchColor]);

  // Commit donde apunta HEAD (rama actual o HEAD desacoplado).
  const currentCommitHash = branches.get(HEAD) ?? (commits.has(HEAD) ? HEAD : null);

  // Commit más reciente por timestamp (empate → hash mayor, igual que el layout).
  const newestHash = useMemo(() => {
    let newest = null;
    let best = -Infinity;
    for (const c of commits.values()) {
      if (c.timestamp > best || (c.timestamp === best && newest && c.hash.localeCompare(newest) > 0)) {
        best = c.timestamp;
        newest = c.hash;
      }
    }
    return newest;
  }, [commits]);

  // Cámara: seguir el commit de HEAD (o el más nuevo) cuando el usuario avanza.
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const focusHash = currentCommitHash ?? newestHash;
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!focusHash || prevFocus.current === focusHash) return;
    prevFocus.current = focusHash;
    const el = containerRef.current;
    const pos = positions.get(focusHash);
    if (!el || !pos) return;

    // Solo movemos la cámara si el commit de HEAD queda fuera de la vista
    // (con un margen), para no robarle el scroll manual al usuario.
    const x = pos.x * zoom;
    const y = pos.y * zoom;
    const margin = NODE_R * 2;
    const inViewX = x >= el.scrollLeft + margin && x <= el.scrollLeft + el.clientWidth - margin;
    const inViewY = y >= el.scrollTop + margin && y <= el.scrollTop + el.clientHeight - margin;
    if (inViewX && inViewY) return;

    el.scrollTo({
      left: Math.max(0, x - el.clientWidth / 2),
      top: Math.max(0, y - el.clientHeight / 2),
      behavior: 'smooth',
    });
  }, [focusHash, positions, zoom]);

  function zoomBy(factor) {
    setZoom((z) => Math.min(2, Math.max(0.3, +(z * factor).toFixed(2))));
  }
  function fitToView() {
    const el = containerRef.current;
    if (!el) return;
    setZoom(Math.min(1, Math.min(el.clientWidth / width, el.clientHeight / height)));
  }

  if (!commits.size) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 gap-2">
        <p className="text-gray-500 text-sm">El grafo aparecerá con tu primer commit</p>
        <p className="text-gray-700 text-xs font-mono">git init → git add archivo → git commit -m "..."</p>
      </div>
    );
  }

  const selectedCommit = selectedHash ? commits.get(selectedHash) : null;

  // Group branches by commit for stacked labels (incluyendo refs remotas).
  const byHash = new Map();
  for (const [name, hash] of branches.entries()) {
    if (!hash) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({ name, kind: 'local' });
  }
  for (const [name, hash] of remoteRefs.entries()) {
    if (!hash || !commits.has(hash)) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({ name, kind: 'remote' });
  }

  return (
    <div ref={containerRef} className="flex-1 bg-gray-950 overflow-auto relative">
      <svg
        width={Math.max(width * zoom, 400)}
        height={Math.max(height * zoom, 200)}
        className="block"
        onClick={() => setSelectedHash(null)}
      >
        <defs>
          <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#665c54" />
          </marker>
        </defs>

        <g transform={`scale(${zoom})`}>
        {/* Edges */}
        {[...commits.values()].flatMap((commit) => {
          const pos = positions.get(commit.hash);
          if (!pos) return [];
          return [commit.parent, commit.secondParent]
            .filter(Boolean)
            .map((parentHash) => {
              const parentPos = positions.get(parentHash);
              if (!parentPos) return null;
              return (
                <path
                  key={`${parentHash}-${commit.hash}`}
                  d={edgePath(parentPos.x, parentPos.y, pos.x, pos.y)}
                  stroke="#504945"
                  strokeWidth={2}
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })
            .filter(Boolean);
        })}

        {/* Commit nodes */}
        <AnimatePresence>
          {[...commits.values()].map((commit) => {
            const pos = positions.get(commit.hash);
            if (!pos) return null;
            const isHead = commit.hash === currentCommitHash;
            const isSelected = commit.hash === selectedHash;
            const isNewest = commit.hash === newestHash;
            const color = nodeColor.get(commit.hash) ?? '#928374';
            const label = commit.message.length > 18
              ? commit.message.slice(0, 17) + '…'
              : commit.message;

            return (
              <motion.g
                key={commit.hash}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelectedHash(commit.hash === selectedHash ? null : commit.hash); }}
              >
                {/* Ping en el commit más reciente: onda tipo radar */}
                {isNewest && !selectedHash && (
                  <motion.circle
                    cx={pos.x} cy={pos.y}
                    fill="none" stroke={color} strokeWidth={2.5}
                    initial={{ r: NODE_R, opacity: 0.55 }}
                    animate={{ r: NODE_R + 22, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 7} fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.4} />
                )}
                {/* HEAD ring */}
                {isHead && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 4} fill="none" stroke="#fabd2f" strokeWidth={2} strokeDasharray="4 2" />
                )}
                {/* Node circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={NODE_R}
                  fill={color}
                  stroke={isSelected ? 'white' : 'transparent'}
                  strokeWidth={1.5}
                  opacity={selectedHash && !isSelected ? 0.45 : 1}
                />
                {/* Hash */}
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontFamily="monospace" fontWeight="bold" fill="white"
                  opacity={selectedHash && !isSelected ? 0.45 : 1}
                >
                  {commit.hash}
                </text>
                {/* Message below */}
                <text
                  x={pos.x} y={pos.y + NODE_R + 14}
                  textAnchor="middle"
                  fontSize={9} fill={isSelected ? '#bdae93' : '#928374'}
                >
                  {label}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Branch labels (locales y remotas) */}
        <AnimatePresence>
          {(() => {
            const items = [];
            for (const [hash, refs] of byHash.entries()) {
              const pos = positions.get(hash);
              if (!pos) continue;
              refs.forEach((ref, stackIndex) => {
                items.push({ ...ref, hash, pos, stackIndex });
              });
            }
            return items.map(({ name, kind, pos, stackIndex }) => {
              const localName = kind === 'remote' ? name.replace(/^origin\//, '') : name;
              const color = branchColor.get(localName) ?? '#928374';
              const isActive = kind === 'local' && name === HEAD;
              const textWidth = name.length * 7 + 16;
              const LABEL_H = 22;
              const labelY = pos.y - NODE_R - 22 - stackIndex * LABEL_H;
              const remote = kind === 'remote';

              return (
                <motion.g
                  key={`label-${name}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <rect
                    x={pos.x - textWidth / 2}
                    y={labelY - 9}
                    width={textWidth}
                    height={18}
                    rx={4}
                    fill={isActive ? color : remote ? '#3c383620' : `${color}40`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray={remote ? '3 2' : undefined}
                  />
                  <text
                    x={pos.x} y={labelY}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fontFamily="monospace"
                    fontWeight={isActive ? 'bold' : 'normal'}
                    fill={isActive ? '#1d2021' : color}
                    opacity={remote ? 0.85 : 1}
                  >
                    {name}
                  </text>
                </motion.g>
              );
            });
          })()}
        </AnimatePresence>

        {/* HEAD label when detached */}
        {!branches.has(HEAD) && commits.has(HEAD) && (() => {
          const pos = positions.get(HEAD);
          if (!pos) return null;
          return (
            <g>
              <rect x={pos.x - 22} y={pos.y - NODE_R - 40} width={44} height={18} rx={4} fill="#fabd2f" />
              <text x={pos.x} y={pos.y - NODE_R - 31} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill="#1d2021">
                HEAD
              </text>
            </g>
          );
        })()}
        </g>
      </svg>

      {/* Branch color legend */}
      <BranchLegend branchColor={branchColor} HEAD={HEAD} />

      {/* Controles de zoom */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-gray-900/80 border border-gray-700 rounded-md p-1 backdrop-blur-sm">
        <button
          onClick={() => zoomBy(0.8)}
          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded text-lg leading-none"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          onClick={fitToView}
          className="px-2 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded text-[11px] font-mono min-w-[42px]"
          aria-label="Ajustar a la vista"
          title="Ajustar a la vista"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => zoomBy(1.25)}
          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded text-lg leading-none"
          aria-label="Acercar"
        >
          +
        </button>
      </div>

      {/* Commit detail panel */}
      <AnimatePresence>
        {selectedCommit && (
          <CommitDetail
            commit={selectedCommit}
            branches={branches}
            tags={tags}
            HEAD={HEAD}
            onClose={() => setSelectedHash(null)}
            onOpenFile={onOpenFile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
