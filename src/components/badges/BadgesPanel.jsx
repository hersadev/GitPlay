import { motion } from 'framer-motion';
import { BADGES } from '../../utils/badges';

export default function BadgesPanel({ earned, onClose }) {
  const total = BADGES.length;
  const got = earned.size;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">Logros</h2>
            <p className="text-xs text-gray-500">{got} de {total} desbloqueados</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BADGES.map((b) => {
            const got = earned.has(b.id);
            return (
              <div
                key={b.id}
                className={`flex items-start gap-3 p-3 rounded border ${
                  got
                    ? 'border-yellow-700/60 bg-yellow-900/10'
                    : 'border-gray-700 bg-gray-800/50 opacity-60'
                }`}
              >
                <span className={`text-2xl flex-shrink-0 ${got ? '' : 'grayscale opacity-50'}`}>
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${got ? 'text-yellow-200' : 'text-gray-400'}`}>
                    {b.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                    {b.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
