import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeLayout, svgDimensions, layoutRefLabels } from '../../utils/graphLayout';
import { useThemeStore } from '../../store/themeStore';

// El SVG pinta con atributos (no clases Tailwind), así que los colores del
// grafo se eligen aquí según el tema. Todos en hex de 6 dígitos: las etiquetas
// les añaden alpha con sufijos tipo `${color}40`.
const GRAPH_PALETTES = {
  classic: {
    branches: [
      '#b8bb26', // verde oliva — main
      '#83a598', // azul
      '#d3869b', // púrpura
      '#fe8019', // naranja
      '#8ec07c', // aqua
      '#fabd2f', // amarillo
    ],
    orphan: '#928374',   // commits sin rama y textos secundarios
    tag: '#d3869b',
    head: '#fabd2f',     // halo/anillo/etiqueta de HEAD
    headText: '#1d2021', // texto sobre fondos `head` y de etiqueta activa
    nodeText: 'white',   // hash dentro del nodo
    remoteFill: '#3c383620',
    dotGrid: '#1f2937',
    msg: '#928374',
    msgSelected: '#bdae93',
    // Mini-grafo del estado vacío.
    ghostLine: '#3f3f46',
    ghostFill: '#1f2937',
    ghostStroke: '#4b5563',
    ghostText: '#6b7280',
  },
  retro: {
    branches: [
      '#39ff39', // verde fósforo — main
      '#3cd6d6', // cian
      '#dd6fdd', // magenta
      '#ff8c1a', // naranja
      '#2ee686', // verde-cian
      '#ffb000', // ámbar
    ],
    orphan: '#4e8a4e',
    tag: '#dd6fdd',
    head: '#ffb000',
    headText: '#000000',
    nodeText: '#000000', // vídeo inverso: negro sobre fósforo
    remoteFill: '#15281540',
    dotGrid: '#122412',
    msg: '#4e8a4e',
    msgSelected: '#85c785',
    ghostLine: '#234023',
    ghostFill: '#0e1e0e',
    ghostStroke: '#3b6b3b',
    ghostText: '#4e8a4e',
  },
};

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
          {commit.secondParent && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-800 align-middle">
              merge
            </span>
          )}
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

  // Cámara: el contenido se dibuja con translate(cam) + scale(zoom) dentro de un
  // SVG que ocupa todo el panel. Así el paneo es libre en cualquier dirección y
  // las etiquetas que sobresalen del grafo (arriba de la primera fila) no se
  // recortan: basta con arrastrar para verlas.
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [cam, setCam] = useState({ x: 0, y: 0 });

  // Paneo con arrastre: pinchar y mover el ratón desplaza la vista.
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef(null); // { x, y, camX, camY, moved }

  function onPanStart(e) {
    // Solo botón izquierdo, y nunca desde los controles flotantes (zoom, detalle, leyenda).
    if (e.button !== 0 || e.target.closest('button')) return;
    panRef.current = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y, moved: false };
    setIsPanning(true);
  }

  useEffect(() => {
    if (!isPanning) return;

    function onMove(e) {
      const pan = panRef.current;
      if (!pan) return;
      const dx = e.clientX - pan.x;
      const dy = e.clientY - pan.y;
      if (!pan.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      pan.moved = true;
      setCam({ x: pan.camX + dx, y: pan.camY + dy });
    }
    function onUp() {
      setIsPanning(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isPanning]);

  // Si hubo arrastre real, el clic que llega después no debe seleccionar/deseleccionar nada.
  function onClickCapture(e) {
    if (panRef.current?.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
    panRef.current = null;
  }

  // La rueda del ratón también panea (sustituye al scroll nativo del contenedor).
  function onWheel(e) {
    setCam((c) => ({ x: c.x - e.deltaX, y: c.y - e.deltaY }));
  }
  const focusHash = currentCommitHash ?? newestHash;
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!focusHash || prevFocus.current === focusHash) return;
    prevFocus.current = focusHash;
    const el = containerRef.current;
    const pos = positions.get(focusHash);
    if (!el || !pos) return;

    // Solo movemos la cámara si el commit de HEAD queda fuera de la vista
    // (con un margen), para no robarle el paneo manual al usuario.
    const margin = NODE_R * 2;
    setCam((c) => {
      const sx = pos.x * zoom + c.x;
      const sy = pos.y * zoom + c.y;
      const inViewX = sx >= margin && sx <= el.clientWidth - margin;
      const inViewY = sy >= margin && sy <= el.clientHeight - margin;
      if (inViewX && inViewY) return c;
      return {
        x: el.clientWidth / 2 - pos.x * zoom,
        y: el.clientHeight / 2 - pos.y * zoom,
      };
    });
  }, [focusHash, positions, zoom]);

  function zoomBy(factor) {
    const nz = Math.min(2, Math.max(0.3, +(zoom * factor).toFixed(2)));
    if (nz === zoom) return;
    const el = containerRef.current;
    if (el) {
      // Zoom centrado: el punto del grafo que está en el centro del panel no se mueve.
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      setCam((c) => ({
        x: cx - (cx - c.x) * (nz / zoom),
        y: cy - (cy - c.y) * (nz / zoom),
      }));
    }
    setZoom(nz);
  }
  function fitToView() {
    const el = containerRef.current;
    if (!el) return;
    const z = Math.min(1, el.clientWidth / width, el.clientHeight / height);
    setZoom(z);
    setCam({
      x: (el.clientWidth - width * z) / 2,
      y: (el.clientHeight - height * z) / 2,
    });
  }
  // Centra la cámara en el commit de HEAD (o el más reciente si no hay HEAD).
  function centerOnHead() {
    const el = containerRef.current;
    const pos = focusHash ? positions.get(focusHash) : null;
    if (!el || !pos) return;
    setCam({
      x: el.clientWidth / 2 - pos.x * zoom,
      y: el.clientHeight / 2 - pos.y * zoom,
    });
  }

  if (!commits.size) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 gap-3">
        {/* Mini-grafo de ejemplo: lo que está por venir */}
        <svg width="200" height="56" className="opacity-70" aria-hidden="true">
          <line x1="44" y1="28" x2="82" y2="28" stroke={palette.ghostLine} strokeWidth="2" />
          <line x1="118" y1="28" x2="154" y2="28" stroke={palette.ghostLine} strokeWidth="2" strokeDasharray="4 3" />
          <circle cx="28" cy="28" r="15" fill={palette.ghostFill} stroke={palette.ghostStroke} strokeWidth="1.5" />
          <circle cx="100" cy="28" r="15" fill={palette.ghostFill} stroke={palette.ghostStroke} strokeWidth="1.5" />
          <circle cx="172" cy="28" r="15" fill="none" stroke={palette.ghostStroke} strokeWidth="1.5" strokeDasharray="4 3" />
          <text x="172" y="29" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill={palette.ghostText} fontFamily="monospace">?</text>
        </svg>
        <p className="text-gray-500 text-sm">El grafo aparecerá con tu primer commit</p>
        <p className="text-gray-700 text-xs font-mono">git init → git add archivo → git commit -m &quot;...&quot;</p>
      </div>
    );
  }

  const selectedCommit = selectedHash ? commits.get(selectedHash) : null;

  // Group branches by commit for stacked labels (incluyendo refs remotas y tags).
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
  for (const [name, hash] of tags.entries()) {
    if (!hash || !commits.has(hash)) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({ name, kind: 'tag' });
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-gray-950 overflow-hidden relative select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={onPanStart}
      onClickCapture={onClickCapture}
      onWheel={onWheel}
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

        <g transform={`translate(${cam.x} ${cam.y}) scale(${zoom})`}>
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
            const isHead = commit.hash === currentCommitHash;
            const isSelected = commit.hash === selectedHash;
            const isNewest = commit.hash === newestHash;
            const color = nodeColor.get(commit.hash) ?? palette.orphan;
            const label = commit.message.length > 18
              ? commit.message.slice(0, 17) + '…'
              : commit.message;

            return (
              <motion.g
                key={commit.hash}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelectedHash(commit.hash === selectedHash ? null : commit.hash); }}
              >
                {/* Tooltip nativo con el mensaje completo */}
                <title>{`${commit.hash} — ${commit.message}\n${commit.author}`}</title>
                {/* Ping en el commit más reciente: onda tipo radar.
                    Si además es HEAD no se dibuja: ahí ya manda el halo dorado */}
                {isNewest && !isHead && !selectedHash && (
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
                {/* "Estás aquí": halo dorado que respira + anillo punteado en
                    movimiento alrededor del commit de HEAD */}
                {isHead && (
                  <>
                    <motion.circle
                      cx={pos.x} cy={pos.y}
                      fill="url(#headGlow)"
                      initial={{ r: NODE_R + 14, opacity: 0.7 }}
                      animate={{ r: [NODE_R + 14, NODE_R + 22, NODE_R + 14], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.circle
                      cx={pos.x} cy={pos.y} r={NODE_R + 5}
                      fill="none" stroke={palette.head} strokeWidth={2.5} strokeDasharray="7 5"
                      animate={{ strokeDashoffset: [0, -24] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                    />
                  </>
                )}
                {/* Node circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={NODE_R}
                  fill={color}
                  stroke={isSelected ? 'white' : 'transparent'}
                  strokeWidth={1.5}
                  opacity={selectedHash && !isSelected ? 0.45 : 1}
                />
                {/* Hash (abreviado a 4 para caber en el nodo; el completo va en el panel) */}
                <text
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontFamily="monospace" fontWeight="bold" fill={palette.nodeText}
                  opacity={selectedHash && !isSelected ? 0.45 : 1}
                >
                  {commit.hash.slice(0, 4)}
                </text>
                {/* Message below — escalonado en dos alturas según la columna
                    para que los títulos de commits vecinos no se solapen */}
                <text
                  x={pos.x} y={pos.y + NODE_R + 14 + (pos.col % 2 ? 13 : 0)}
                  textAnchor="middle"
                  fontSize={9} fill={isSelected ? palette.msgSelected : palette.msg}
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
              refs.forEach((ref) => {
                // La rama activa se etiqueta como en git log: "HEAD → rama"
                const text = ref.kind === 'tag' ? `◆ ${ref.name}`
                  : ref.kind === 'local' && ref.name === HEAD ? `HEAD → ${ref.name}`
                  : ref.name;
                items.push({ ...ref, hash, pos, text, textWidth: text.length * 7 + 16 });
              });
            }
            // Reparte las etiquetas en "pisos" para que las de commits
            // vecinos no se solapen entre sí.
            layoutRefLabels(items);
            return items.map(({ name, kind, pos, text, textWidth, level, isStackBase }) => {
              const localName = kind === 'remote' ? name.replace(/^origin\//, '') : name;
              const color = kind === 'tag' ? palette.tag : branchColor.get(localName) ?? palette.orphan;
              const isActive = kind === 'local' && name === HEAD;
              const LABEL_H = 22;
              const labelY = pos.y - NODE_R - 22 - level * LABEL_H;
              const remote = kind === 'remote';

              return (
                <motion.g
                  key={`label-${kind}-${name}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Si la pila quedó elevada por colisiones, un conector
                      punteado indica a qué commit pertenece */}
                  {isStackBase && level > 0 && (
                    <line
                      x1={pos.x} y1={labelY + 9}
                      x2={pos.x} y2={pos.y - NODE_R - 2}
                      stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.55}
                    />
                  )}
                  {/* Pin de la etiqueta activa: triángulo que apunta al commit,
                      estilo "estás aquí" de un mapa */}
                  {isActive && isStackBase && (
                    <path
                      d={`M ${pos.x - 5} ${labelY + 8} L ${pos.x + 5} ${labelY + 8} L ${pos.x} ${labelY + 16} Z`}
                      fill={color}
                    />
                  )}
                  <rect
                    x={pos.x - textWidth / 2}
                    y={labelY - 9}
                    width={textWidth}
                    height={18}
                    rx={kind === 'tag' ? 9 : 4}
                    fill={isActive ? color : remote ? palette.remoteFill : kind === 'tag' ? `${color}26` : `${color}40`}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray={remote ? '3 2' : undefined}
                  />
                  <text
                    x={pos.x} y={labelY}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fontFamily="monospace"
                    fontWeight={isActive ? 'bold' : 'normal'}
                    fill={isActive ? palette.headText : color}
                    opacity={remote ? 0.85 : 1}
                  >
                    {text}
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
        <div className="w-px h-4 bg-gray-700 mx-0.5" />
        <button
          onClick={centerOnHead}
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
