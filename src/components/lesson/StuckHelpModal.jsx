import { useEffect } from 'react';
import { motion } from 'framer-motion';
import LessonObjective from './LessonObjective';

// Modal de rescate: se abre solo cuando el jugador encadena varios errores
// seguidos en la misma lección. Explica qué está pasando (la descripción de
// la lección) y desvela de golpe todos los pasos para resolverla (las pistas).
// Se cierra pinchando la X, pinchando fuera (backdrop), con Escape o con el
// botón de abajo.
export default function StuckHelpModal({ lesson, progress, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!lesson) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[58] bg-black/70 flex items-center justify-center p-4"
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
        aria-label="Ayuda de la lección"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="p-6 pb-4 flex-shrink-0 text-center">
          <p className="text-4xl mb-2">🧭</p>
          <h2 className="text-xl font-bold text-white">Esta lección se está resistiendo</h2>
          <p className="text-sm text-gray-400 mt-1.5 leading-snug">
            Varios intentos seguidos no han funcionado. No pasa nada: respira, que lo vemos con calma.
          </p>
        </div>

        <div className="px-6 flex flex-col gap-4 overflow-y-auto">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
              Qué está pasando en «{lesson.title}»
            </h3>
            <p className="text-sm text-gray-300 leading-snug">{lesson.description}</p>
          </div>

          <LessonObjective objectives={lesson.objectives} progress={progress} />

          {lesson.hints?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                Pasos para resolverla
              </h3>
              <ol className="space-y-1">
                {lesson.hints.map((hint, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm text-yellow-300 bg-yellow-900/20 rounded px-2 py-1 leading-snug"
                  >
                    <span className="text-yellow-500/70 font-mono text-xs flex-shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="p-6 pt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
          >
            Voy a intentarlo de nuevo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
