import { motion } from 'framer-motion';

// Panel flotante con el detalle del commit seleccionado en el grafo.
export default function CommitDetail({ commit, branches, tags, HEAD, onClose, onOpenFile }) {
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
