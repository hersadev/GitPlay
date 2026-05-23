import { useMemo } from 'react';
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

export default function GraphView({ commits, branches, HEAD }) {
  const positions = useMemo(() => computeLayout(commits, branches), [commits, branches]);
  const { width, height } = useMemo(() => svgDimensions(positions), [positions]);

  // Branch color by index (main always index 0)
  const branchColor = useMemo(() => {
    const order = [...branches.keys()].sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : 0));
    const map = new Map();
    order.forEach((name, i) => map.set(name, BRANCH_PALETTE[i % BRANCH_PALETTE.length]));
    return map;
  }, [branches]);

  // Node color = color of the branch it "belongs to"
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

  return (
    <div className="flex-1 bg-gray-950 overflow-auto">
      <svg
        width={Math.max(width, 400)}
        height={Math.max(height, 200)}
        className="block"
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
            const color = nodeColor.get(commit.hash) ?? '#6b7280';
            const label = commit.message.length > 16
              ? commit.message.slice(0, 15) + '…'
              : commit.message;

            return (
              <motion.g
                key={commit.hash}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              >
                {/* HEAD ring */}
                {isHead && (
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 5} fill="none" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 2" />
                )}
                {/* Node circle */}
                <circle cx={pos.x} cy={pos.y} r={NODE_R} fill={color} />
                {/* Hash */}
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontFamily="monospace" fontWeight="bold" fill="white"
                >
                  {commit.hash}
                </text>
                {/* Message below */}
                <text
                  x={pos.x} y={pos.y + NODE_R + 14}
                  textAnchor="middle"
                  fontSize={9} fill="#6b7280"
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
            const labelY = pos.y - NODE_R - 22;

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
    </div>
  );
}
