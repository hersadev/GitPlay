import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Modal que anuncia, al entrar en un módulo nuevo, qué comandos se van a
// practicar en él. Se cierra pinchando la X, pinchando fuera (backdrop),
// con Escape o con el botón "Entendido".
export default function ModuleIntroModal({ moduleDef, commands, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!moduleDef) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[65] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Comandos del ${moduleDef.name}`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="p-6 pb-4 text-center flex-shrink-0">
          <p className="text-4xl mb-2">{moduleDef.icon}</p>
          <h2 className="text-xl font-bold text-white">{moduleDef.name}</h2>
          <p className="text-sm text-gray-400 mt-1.5 leading-snug">
            Estos son los comandos que vas a usar en este módulo:
          </p>
        </div>

        <ul className="px-6 flex flex-col gap-3 overflow-y-auto">
          {commands.map((c) => (
            <li key={c.cmd} className="flex items-start gap-3">
              <span className="text-green-400 text-xs font-mono flex-shrink-0 mt-1">$</span>
              <div>
                <code className="text-sm text-gray-100 font-mono">{c.usage}</code>
                <p className="text-xs text-gray-400 leading-snug mt-0.5">{c.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="p-6 pt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
