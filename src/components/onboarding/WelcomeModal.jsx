import { useEffect } from 'react';
import { motion } from 'framer-motion';

// Modal de bienvenida para nuevos usuarios (o tras reiniciar el juego).
// Se cierra pinchando la X, pinchando fuera (backdrop) o con Escape.

const STEPS = [
  {
    icon: '🎯',
    title: 'Tu misión, a la izquierda',
    text: 'Cada lección cuenta una mini-historia y te da objetivos. Si te atascas, pulsa "Mostrar pista".',
  },
  {
    icon: '⌨️',
    title: 'El terminal, abajo',
    text: 'Escribe comandos Git de verdad: git init, git add, git commit… Prueba sin miedo, aquí no se rompe nada.',
  },
  {
    icon: '🌳',
    title: 'El grafo, en el centro',
    text: 'Mira cómo cada comando cambia los commits y las ramas al instante. Es Git haciéndose visible.',
  },
  {
    icon: '✅',
    title: 'Avanzar es automático',
    text: 'Al cumplir todos los objetivos pasas a la siguiente lección. Por el camino irás desbloqueando logros 🏆.',
  },
];

export default function WelcomeModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida a GitPlay"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="text-center">
          <p className="text-4xl mb-2">👋</p>
          <h2 className="text-xl font-bold text-white">¡Bienvenido a GitPlay!</h2>
          <p className="text-sm text-gray-400 mt-1.5 leading-snug">
            Aprende Git jugando: un repositorio simulado donde practicar
            los comandos que usan los equipos de verdad.
          </p>
        </div>

        <ul className="mt-5 space-y-3">
          {STEPS.map((s) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{s.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-100">{s.title}</p>
                <p className="text-xs text-gray-400 leading-snug">{s.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="mt-6 w-full px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
        >
          ¡A jugar! →
        </button>

        <p className="text-[11px] text-gray-500 text-center mt-3">
          Empieza escribiendo <code className="text-gray-300">git init</code> en el terminal.
        </p>
      </motion.div>
    </motion.div>
  );
}
