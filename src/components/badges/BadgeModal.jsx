import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Modal que anuncia un logro recién desbloqueado.
// Se cierra pinchando la X, pinchando fuera (backdrop) o con Escape.
export default function BadgeModal({ badge, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!badge) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="relative bg-gray-900 border border-yellow-700/60 rounded-xl w-full max-w-sm p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Logro desbloqueado: ${badge.name}`}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <p className="text-[11px] uppercase tracking-widest text-yellow-500 font-semibold">
          ¡Logro desbloqueado!
        </p>

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
          className="text-6xl my-4"
        >
          {badge.icon}
        </motion.div>

        <h2 className="text-xl font-bold text-yellow-200">{badge.name}</h2>
        <p className="text-sm text-gray-300 mt-2 leading-snug">{badge.description}</p>

        <button
          onClick={onClose}
          className="mt-6 px-5 py-2 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-semibold transition-colors"
        >
          ¡Genial!
        </button>
      </motion.div>
    </motion.div>
  );
}
