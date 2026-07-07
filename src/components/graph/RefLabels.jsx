import { motion, AnimatePresence } from 'framer-motion';
import { layoutRefLabels } from '../../utils/graphLayout';
import { NODE_R } from './palettes';

// Etiquetas de refs sobre los commits: ramas locales, refs remotas
// (origin/...) y tags, apiladas en "pisos" para no solaparse.
export default function RefLabels({ commits, branches, remoteRefs, tags, HEAD, positions, branchColor, palette }) {
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

  return (
    <AnimatePresence>
      {items.map(({ name, kind, pos, text, textWidth, level, isStackBase }) => {
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
      })}
    </AnimatePresence>
  );
}
