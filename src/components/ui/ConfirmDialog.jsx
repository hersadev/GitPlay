import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Modal de confirmación para acciones destructivas o importantes.
// Se cancela pinchando la X, pinchando fuera (backdrop) o con Escape.

export default function ConfirmDialog({
  title,
  message,
  hint,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className={`relative bg-gray-900 border rounded-xl w-full max-w-sm p-6 shadow-2xl ${
          danger ? 'border-red-900/70' : 'border-gray-700'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <h2 className="text-lg font-bold text-white pr-6">{title}</h2>
        <p className="text-sm text-gray-300 mt-2 leading-snug">{message}</p>
        {hint && (
          <p className="text-xs text-gray-500 mt-3 leading-snug">{hint}</p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
              danger ? 'bg-red-800 hover:bg-red-700' : 'bg-green-700 hover:bg-green-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
