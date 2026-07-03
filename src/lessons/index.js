// Fuente única del orden pedagógico de los módulos y su agrupación en niveles.
// La usan App (secuencia de lecciones), LessonSelector (agrupación) y
// badges (umbrales de "nivel completado" calculados, no hardcodeados).

import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { module5 } from './module5';
import { moduleGithub } from './moduleGithub';
import { moduleBridge } from './moduleBridge';

// Niveles de dificultad: agrupan módulos completos (los módulos de un nivel
// son contiguos en MODULES; los umbrales de badges dependen de ello).
export const LEVELS = [
  {
    id: 'basico',
    name: 'Nivel básico',
    icon: '🥉',
    tagline: 'Iniciar el repositorio, hacer commits, crear ramas y moverte entre ellas.',
    chipClass: 'text-green-400 border-green-800',
  },
  {
    id: 'medio',
    name: 'Nivel medio',
    icon: '🥈',
    tagline: 'Pushear, pullear, Pull Requests, modificar commits y limpiar la historia.',
    chipClass: 'text-yellow-400 border-yellow-800',
  },
  {
    id: 'avanzado',
    name: 'Nivel avanzado',
    icon: '🥇',
    tagline: 'Rebase, reflog, GitFlow y escenarios reales de rescate.',
    chipClass: 'text-purple-400 border-purple-800',
  },
];

// Orden pedagógico: básicos → ramas → GitHub → reescribir historia → equipo → escenarios reales.
export const MODULES = [
  { id: 'module-1', name: 'Módulo 1 — Arrancar TaskFlow', icon: '1️⃣', level: 'basico', lessons: module1 },
  { id: 'module-2', name: 'Módulo 2 — Features en ramas', icon: '2️⃣', level: 'basico', lessons: module2 },
  { id: 'module-3', name: 'Módulo 3 — Trabajar con GitHub', icon: '3️⃣', level: 'medio', lessons: moduleGithub },
  { id: 'module-4', name: 'Módulo 4 — Reescribir historia y releases', icon: '4️⃣', level: 'medio', lessons: module3 },
  { id: 'module-5', name: 'Módulo 5 — Trabajo en equipo avanzado', icon: '5️⃣', level: 'avanzado', lessons: module4 },
  { id: 'module-6', name: 'Módulo 6 — Escenarios reales', icon: '6️⃣', level: 'avanzado', lessons: module5 },
  { id: 'module-7', name: 'Módulo 7 — Git de verdad (opcional)', icon: '🚀', level: 'avanzado', lessons: moduleBridge },
];

export const ALL_LESSONS = MODULES.flatMap((m) => m.lessons);

// Índice del módulo (0-based) al que pertenece cada lección, en el mismo
// orden que ALL_LESSONS. Permite saber, a partir de lessonIndex, cuándo el
// jugador entra en un módulo nuevo.
export const LESSON_MODULE_INDEX = MODULES.flatMap((m, mi) => m.lessons.map(() => mi));
