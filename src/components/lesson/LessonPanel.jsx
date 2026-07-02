import { motion } from 'framer-motion';
import LessonObjective from './LessonObjective';
import HintSystem from './HintSystem';
import ProgressBar from './ProgressBar';
import Curiosity from './Curiosity';

export default function LessonPanel({ lesson, lessonIndex, total, progress, isComplete, onCompleteOptional }) {
  if (!lesson) {
    return (
      <aside className="w-80 flex flex-col items-center justify-center p-6 bg-gray-900 border-r border-gray-700 text-center">
        <p className="text-green-400 text-2xl mb-2">🎉</p>
        <p className="text-white font-semibold">¡Has completado todas las lecciones!</p>
        <p className="text-gray-400 text-sm mt-2">Usa el Sandbox para seguir explorando.</p>
      </aside>
    );
  }

  // Lección opcional (sin objetivos validables): pasos informativos + botones.
  if (lesson.optional) {
    return (
      <aside className="w-80 flex flex-col gap-4 p-4 bg-gray-900 border-r border-gray-700 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            Lección {lessonIndex + 1} de {total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-yellow-400 border border-yellow-800 rounded px-1.5 py-0.5">
            Opcional
          </span>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white leading-snug">{lesson.title}</h2>
          <p className="text-gray-400 text-sm mt-1">{lesson.description}</p>
        </div>

        {lesson.steps?.length > 0 && (
          <ol className="flex flex-col gap-2">
            {lesson.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300 leading-snug">
                <span className="text-gray-500 font-mono text-xs flex-shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}

        <Curiosity text={lesson.curiosity} />

        <div className="flex flex-col gap-2 mt-auto pt-2">
          <button
            onClick={onCompleteOptional}
            className="w-full py-2 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
          >
            ✓ Hecho — terminar el curso
          </button>
          <button
            onClick={onCompleteOptional}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Saltar esta lección (ya tengo Git instalado)
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 flex flex-col gap-4 p-4 bg-gray-900 border-r border-gray-700 overflow-y-auto">
      {/* Lesson counter */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          Lección {lessonIndex + 1} de {total}
        </span>
        {isComplete && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs text-green-400 font-semibold"
          >
            Completada ✓
          </motion.span>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-white leading-snug">{lesson.title}</h2>
        <p className="text-gray-400 text-sm mt-1">{lesson.description}</p>
      </div>

      <LessonObjective objectives={lesson.objectives} progress={progress} />
      <HintSystem hints={lesson.hints} />
      <ProgressBar value={progress} max={lesson.objectives?.length ?? 1} />
      <Curiosity text={lesson.curiosity} />
    </aside>
  );
}
