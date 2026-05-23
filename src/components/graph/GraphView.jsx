import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeLayout, svgDimensions } from '../../utils/graphLayout';

const BRANCH_PALETTE = [
  '#4ade80', // green  — main
  '#60a5fa', // blue
  '#f472b6', // pink
  '#fb923c', // orange
  '#a78bfa', // purple
  '#34d399', // emerald
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

function CommitDetail({ commit, branches, tags, HEAD, onClose }) {
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
                <li key={f} className="flex items-center gap-1 text-xs font-mono text-green-300">
                  <span className="text-green-500">+</span>{f}
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

export default function GraphView({ commits, branches, tags = new Map(), HEAD }) {
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
    commits.forEach((_, h) => { if (!map.has(h)) map.set(h, '#6b7280'); });
    return map;
  }, [commits, branches, branchColor]);

  if (!commits.size) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 gap-2">
        <p className="text-gray-500 text-sm">El grafo aparecerá con tu primer commit</p>
        <p className="text-gray-700 text-xs font-mono">git init → git add archivo → git commit -m "..."</p>
      </div>
    );
  }

  const currentCommitHash = branches.get(HEAD) ?? (commits.has(HEAD) ? HEAD : null);
  const selectedCommit = selectedHash ? commits.get(selectedHash) : null;

  // Group branches by commit for stacked labels
  const byHash = new Map();
  for (const [name, hash] of branches.entries()) {
    if (!hash) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(name);
  }

  return (
    <div className="flex-1 bg-gray-950 overflow-auto relative">
      <svg
        width={Math.max(width, 400)}
        height={Math.max(height, 200)}
        className="block"
        onClick={() => setSelectedHash(null)}
      >
        <defs>
          <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#4b5563" />
          </marker>
        </defs>

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
                  stroke="#374151"
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
            const color = nodeColor.get(commit.hash) ?? '#6b7280';
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
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 7} fill="none" stroke="white" strokeWidth={1.5} strokeOpacity={0.4} />
                )}
                {/* HEAD ring */}
                {isHead && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 4} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 2" />
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
                  fontSize={9} fill={isSelected ? '#d1d5db' : '#6b7280'}
                >
                  {label}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Branch labels */}
        <AnimatePresence>
          {[...branches.entries()].map(([name, hash]) => {
            if (!hash) return null;
            const pos = positions.get(hash);
            if (!pos) return null;
            const color = branchColor.get(name) ?? '#6b7280';
            const isActive = name === HEAD;
            const textWidth = name.length * 7 + 16;
            const stackIndex = byHash.get(hash)?.indexOf(name) ?? 0;
            const LABEL_H = 22;
            const labelY = pos.y - NODE_R - 22 - stackIndex * LABEL_H;

            return (
              <motion.g
                key={`branch-${name}`}
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
                  fill={isActive ? color : `${color}40`}
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  x={pos.x} y={labelY}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontFamily="monospace"
                  fontWeight={isActive ? 'bold' : 'normal'}
                  fill={isActive ? '#000' : color}
                >
                  {name}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* HEAD label when detached */}
        {!branches.has(HEAD) && commits.has(HEAD) && (() => {
          const pos = positions.get(HEAD);
          if (!pos) return null;
          return (
            <g>
              <rect x={pos.x - 22} y={pos.y - NODE_R - 40} width={44} height={18} rx={4} fill="#fbbf24" />
              <text x={pos.x} y={pos.y - NODE_R - 31} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill="#000">
                HEAD
              </text>
            </g>
          );
        })()}
      </svg>

      {/* Branch color legend */}
      <BranchLegend branchColor={branchColor} HEAD={HEAD} />

      {/* Commit detail panel */}
      <AnimatePresence>
        {selectedCommit && (
          <CommitDetail
            commit={selectedCommit}
            branches={branches}
            tags={tags}
            HEAD={HEAD}
            onClose={() => setSelectedHash(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
