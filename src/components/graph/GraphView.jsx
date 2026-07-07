import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { computeLayout, svgDimensions } from '../../utils/graphLayout';
import { useThemeStore } from '../../store/themeStore';
import { GRAPH_PALETTES, NODE_R } from './palettes';
import { useGraphCamera } from './useGraphCamera';
import CommitNode from './CommitNode';
import RefLabels from './RefLabels';
import CommitDetail from './CommitDetail';
import BranchLegend from './BranchLegend';
import EmptyGraph from './EmptyGraph';

function edgePath(x1, y1, x2, y2) {
  if (y1 === y2) {
    return `M ${x1 + NODE_R} ${y1} L ${x2 - NODE_R} ${y2}`;
  }
  const cx1 = x1 + NODE_R + 40;
  const cx2 = x2 - NODE_R - 40;
  return `M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`;
}

export default function GraphView({ commits, branches, tags = new Map(), remoteRefs = new Map(), HEAD, onOpenFile }) {
  const [selectedHash, setSelectedHash] = useState(null);
  const theme = useThemeStore((s) => s.theme);
  const palette = GRAPH_PALETTES[theme] ?? GRAPH_PALETTES.classic;

  // Colores posibles de arista (paleta + huérfano) para generar una
  // punta de flecha del mismo color que cada arista.
  const edgeColors = [...palette.branches, palette.orphan];
  const arrowId = (color) => `arrow-${Math.max(0, edgeColors.indexOf(color))}`;

  const positions = useMemo(() => computeLayout(commits, branches), [commits, branches]);
  const { width, height } = useMemo(() => svgDimensions(positions), [positions]);

  const branchColor = useMemo(() => {
    const order = [...branches.keys()].sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : 0));
    const map = new Map();
    order.forEach((name, i) => map.set(name, palette.branches[i % palette.branches.length]));
    return map;
  }, [branches, palette]);

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
    commits.forEach((_, h) => { if (!map.has(h)) map.set(h, palette.orphan); });
    return map;
  }, [commits, branches, branchColor, palette]);

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

  const focusHash = currentCommitHash ?? newestHash;
  const camera = useGraphCamera({ width, height, positions, focusHash });

  if (!commits.size) {
    return <EmptyGraph palette={palette} />;
  }

  const selectedCommit = selectedHash ? commits.get(selectedHash) : null;

  return (
    <div
      ref={camera.containerRef}
      className={`flex-1 bg-gray-950 overflow-hidden relative select-none ${camera.isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={camera.onPanStart}
      onClickCapture={camera.onClickCapture}
      onWheel={camera.onWheel}
    >
      <svg
        width="100%"
        height="100%"
        className="block"
        onClick={() => setSelectedHash(null)}
      >
        <defs>
          {/* Una punta de flecha por color de rama, para que cada arista
              lleve la flecha a juego */}
          {edgeColors.map((color) => (
            <marker key={color} id={arrowId(color)} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={color} fillOpacity={0.8} />
            </marker>
          ))}
          {/* Rejilla de puntos: da sensación de lienzo y hace visible el paneo/zoom */}
          <pattern id="dotgrid" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.2" fill={palette.dotGrid} />
          </pattern>
          {/* Halo dorado del commit actual (HEAD) */}
          <radialGradient id="headGlow">
            <stop offset="0%" stopColor={palette.head} stopOpacity="0.4" />
            <stop offset="55%" stopColor={palette.head} stopOpacity="0.18" />
            <stop offset="100%" stopColor={palette.head} stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${camera.cam.x} ${camera.cam.y}) scale(${camera.zoom})`}>
        {/* Fondo de rejilla, solidario con la cámara */}
        <rect x={-4000} y={-4000} width={width + 8000} height={height + 8000} fill="url(#dotgrid)" />

        {/* Edges: cada arista hereda el color de la rama del commit hijo;
            la segunda arista de un merge lleva el color de la rama que entra */}
        {[...commits.values()].flatMap((commit) => {
          const pos = positions.get(commit.hash);
          if (!pos) return [];
          const edges = [];
          const pushEdge = (parentHash, color) => {
            const parentPos = positions.get(parentHash);
            if (!parentPos) return;
            edges.push(
              <path
                key={`${parentHash}-${commit.hash}`}
                d={edgePath(parentPos.x, parentPos.y, pos.x, pos.y)}
                stroke={color}
                strokeOpacity={0.55}
                strokeWidth={2}
                fill="none"
                markerEnd={`url(#${arrowId(color)})`}
              />
            );
          };
          if (commit.parent) pushEdge(commit.parent, nodeColor.get(commit.hash) ?? palette.orphan);
          if (commit.secondParent) pushEdge(commit.secondParent, nodeColor.get(commit.secondParent) ?? palette.orphan);
          return edges;
        })}

        {/* Commit nodes */}
        <AnimatePresence>
          {[...commits.values()].map((commit) => {
            const pos = positions.get(commit.hash);
            if (!pos) return null;
            return (
              <CommitNode
                key={commit.hash}
                commit={commit}
                pos={pos}
                color={nodeColor.get(commit.hash) ?? palette.orphan}
                palette={palette}
                isHead={commit.hash === currentCommitHash}
                isSelected={commit.hash === selectedHash}
                isNewest={commit.hash === newestHash}
                anySelected={!!selectedHash}
                onToggle={() => setSelectedHash(commit.hash === selectedHash ? null : commit.hash)}
              />
            );
          })}
        </AnimatePresence>

        {/* Branch labels (locales y remotas) */}
        <RefLabels
          commits={commits}
          branches={branches}
          remoteRefs={remoteRefs}
          tags={tags}
          HEAD={HEAD}
          positions={positions}
          branchColor={branchColor}
          palette={palette}
        />

        {/* HEAD label when detached */}
        {!branches.has(HEAD) && commits.has(HEAD) && (() => {
          const pos = positions.get(HEAD);
          if (!pos) return null;
          return (
            <g>
              <rect x={pos.x - 22} y={pos.y - NODE_R - 40} width={44} height={18} rx={4} fill={palette.head} />
              <text x={pos.x} y={pos.y - NODE_R - 31} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill={palette.headText}>
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
          onClick={() => camera.zoomBy(0.8)}
          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded text-lg leading-none"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          onClick={camera.fitToView}
          className="px-2 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded text-[11px] font-mono min-w-[42px]"
          aria-label="Ajustar a la vista"
          title="Ajustar a la vista"
        >
          {Math.round(camera.zoom * 100)}%
        </button>
        <button
          onClick={() => camera.zoomBy(1.25)}
          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 rounded text-lg leading-none"
          aria-label="Acercar"
        >
          +
        </button>
        <div className="w-px h-4 bg-gray-700 mx-0.5" />
        <button
          onClick={camera.centerOnHead}
          className="w-7 h-7 flex items-center justify-center text-yellow-400 hover:text-yellow-200 hover:bg-gray-700 rounded text-lg leading-none"
          aria-label="Ir a donde estás (HEAD)"
          title="Ir a donde estás (HEAD)"
        >
          ⌖
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
