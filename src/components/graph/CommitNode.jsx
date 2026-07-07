import { motion } from 'framer-motion';
import { NODE_R } from './palettes';

// Un commit del grafo: círculo con el hash, halo "estás aquí" de HEAD,
// ping del commit más reciente, anillo de selección y mensaje debajo.
export default function CommitNode({ commit, pos, color, palette, isHead, isSelected, isNewest, anySelected, onToggle }) {
  const label = commit.message.length > 18
    ? commit.message.slice(0, 17) + '…'
    : commit.message;

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ transformOrigin: `${pos.x}px ${pos.y}px`, cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {/* Tooltip nativo con el mensaje completo */}
      <title>{`${commit.hash} — ${commit.message}\n${commit.author}`}</title>
      {/* Ping en el commit más reciente: onda tipo radar.
          Si además es HEAD no se dibuja: ahí ya manda el halo dorado */}
      {isNewest && !isHead && !anySelected && (
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
        opacity={anySelected && !isSelected ? 0.45 : 1}
      />
      {/* Hash (abreviado a 4 para caber en el nodo; el completo va en el panel) */}
      <text
        x={pos.x} y={pos.y}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontFamily="monospace" fontWeight="bold" fill={palette.nodeText}
        opacity={anySelected && !isSelected ? 0.45 : 1}
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
}
