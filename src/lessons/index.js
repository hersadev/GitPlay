// Fuente única del orden pedagógico de los módulos.
// La usan App (secuencia de lecciones), LessonSelector (agrupación) y
// badges (umbrales de "módulo completado" calculados, no hardcodeados).

import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { module5 } from './module5';
import { moduleGithub } from './moduleGithub';
import { moduleBridge } from './moduleBridge';

// Orden pedagógico: básicos → ramas → GitHub → reescribir historia → equipo → escenarios reales.
export const MODULES = [
  { id: 'module-1', name: 'Módulo 1 — Arrancar TaskFlow', icon: '1️⃣', lessons: module1 },
  { id: 'module-2', name: 'Módulo 2 — Features en ramas', icon: '2️⃣', lessons: module2 },
  { id: 'module-3', name: 'Módulo 3 — Trabajar con GitHub', icon: '3️⃣', lessons: moduleGithub },
  { id: 'module-4', name: 'Módulo 4 — Reescribir historia y releases', icon: '4️⃣', lessons: module3 },
  { id: 'module-5', name: 'Módulo 5 — Trabajo en equipo avanzado', icon: '5️⃣', lessons: module4 },
  { id: 'module-6', name: 'Módulo 6 — Escenarios reales', icon: '6️⃣', lessons: module5 },
  { id: 'module-7', name: 'Módulo 7 — Git de verdad (opcional)', icon: '🚀', lessons: moduleBridge },
];

export const ALL_LESSONS = MODULES.flatMap((m) => m.lessons);
