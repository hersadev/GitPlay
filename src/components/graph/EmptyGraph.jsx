// Estado vacío del grafo (repo sin commits): mini-grafo de ejemplo y pista.
export default function EmptyGraph({ palette }) {
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
