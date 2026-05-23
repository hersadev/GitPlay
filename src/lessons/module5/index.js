// Módulo 5 — Escenarios reales (5 lecciones)
// Situaciones que aparecen en proyectos de verdad. Cada lección es un caso completo.

import {
  onBranch,
  hasBranch,
  hasTag,
  lastCmd,
  lastArg,
  fileOnBranch,
  fileNotOnBranch,
  hasFileAnywhere,
} from '../_helpers';
import {
  EXPERIMENTAL_JS,
  CSRF_FIX_JS,
  PAYMENTS_JSX,
  API_REFACTORED_JS,
} from './fixtures';

export const module5 = [
  {
    id: 'm5-l1',
    title: 'Escenario: "Commiteé en main por error"',
    description:
      'Hiciste un commit experimental directamente en main que debería haber ido en su rama. La solución: crea una rama AHORA desde el commit actual (guarda el trabajo), luego rebobina main con `reset --hard`.',
    objectives: [
      {
        label: 'Hacer un commit con experimental.js en main',
        validate: (s) => hasFileAnywhere('experimental.js')(s),
      },
      {
        label: 'Crear la rama "experimento" apuntando a ese commit',
        validate: fileOnBranch('experimental.js', 'experimento'),
      },
      {
        label: 'Rebobinar main para que no contenga experimental.js',
        validate: fileNotOnBranch('experimental.js', 'main'),
      },
    ],
    hints: [
      'git switch main',
      'git add experimental.js && git commit -m "feat: probar algo"',
      'git branch experimento   (guarda el commit en una rama paralela)',
      'git reset --hard HEAD~1  (rebobina main al commit anterior)',
      'Verifica: git log main (no debe aparecer) y git log experimento (sí)',
    ],
    setupFiles: { 'experimental.js': EXPERIMENTAL_JS },
    curiosity:
      'Si todavía no has hecho push, este truco es indistinguible de no haberte equivocado nunca. La regla informal: cuanto antes te das cuenta del error, menos invasiva es la solución.',
  },
  {
    id: 'm5-l2',
    title: 'Escenario: "Portar hotfix de CSRF a release/1.0"',
    description:
      'La v1.0 está en producción en la rama `release/1.0`. Mientras tanto, en main detectaste y arreglaste un fallo de CSRF. No quieres mergear toda main a release/1.0 — solo necesitas ese commit. Cherry-pick al rescate.',
    objectives: [
      { label: 'Crear la rama release/1.0', validate: hasBranch('release/1.0') },
      {
        label: 'Tener el fix con csrf-fix.js en main',
        validate: fileOnBranch('csrf-fix.js', 'main'),
      },
      {
        label: 'Aplicar el fix a release/1.0 con cherry-pick',
        validate: (s) => onBranch('release/1.0')(s) && fileOnBranch('csrf-fix.js', 'release/1.0')(s),
      },
    ],
    hints: [
      'Crea la rama de release desde el estado estable: git branch release/1.0',
      'Vuelve a main si no estás: git switch main',
      'git add csrf-fix.js && git commit -m "fix: validar token CSRF en /api/login"',
      'Anota el hash con: git log',
      'git switch release/1.0 && git cherry-pick <hash>',
    ],
    setupFiles: { 'csrf-fix.js': CSRF_FIX_JS },
    curiosity:
      'En proyectos grandes (Linux, Chromium, Postgres…) los hotfixes se aplican primero en la rama principal y luego se "back-portan" a las versiones de soporte con cherry-pick. Es exactamente este flujo, repetido a escala industrial.',
  },
  {
    id: 'm5-l3',
    title: 'Escenario: "Pánico, hice reset --hard de más"',
    description:
      'Querías rebobinar 1 commit y rebobinaste 3. Has "perdido" trabajo importante. Respira: el reflog lo conserva. Encuentra el hash anterior y crea una rama desde ahí.',
    objectives: [
      {
        label: 'El reflog registra un reset previo (simula la pérdida)',
        validate: (s) => s.reflog.some((e) => e.message?.startsWith('reset:')),
      },
      {
        label: 'Crear la rama "salvado" para recuperar el trabajo',
        validate: hasBranch('salvado'),
      },
    ],
    hints: [
      'Si necesitas simular: git reset --hard HEAD~2',
      'git reflog   (busca el hash que tenías antes del reset)',
      'git branch salvado <hash>',
      'git switch salvado (todo vuelve a estar)',
    ],
    curiosity:
      'Hay un dicho entre devs: "Si no tienes copia, no entres en pánico: tienes reflog". Mientras no hagas `git gc --prune=now` ni esperes 30 días, casi cualquier desastre local es reversible.',
  },
  {
    id: 'm5-l4',
    title: 'Escenario: "Mi rama feature/payments está desactualizada"',
    description:
      'Llevas días en `feature/payments`. Mientras tanto main avanzó con varios commits de otros devs. Antes de mergear, rebasea tu rama sobre main — así tu merge final será un fast-forward limpio, sin merge commit.',
    objectives: [
      {
        label: 'Tener feature/payments con Payments.jsx',
        validate: fileOnBranch('Payments.jsx', 'feature/payments'),
      },
      {
        label: 'Rebasear feature/payments sobre main',
        validate: (s) => onBranch('feature/payments')(s) && lastCmd('rebase')(s),
      },
      {
        label: 'Mergear feature/payments a main (con Payments.jsx integrado)',
        validate: (s) => onBranch('main')(s) && fileOnBranch('Payments.jsx', 'main')(s),
      },
    ],
    hints: [
      'git switch -c feature/payments && git add Payments.jsx && git commit -m "feat: integrar Stripe"',
      'Simula avance de main: git switch main && git add api.js && git commit -m "chore: refactor api"',
      'git switch feature/payments && git rebase main',
      'git switch main && git merge feature/payments  (ahora será fast-forward)',
    ],
    setupFiles: { 'Payments.jsx': PAYMENTS_JSX, 'api.js': API_REFACTORED_JS },
    curiosity:
      'Hay dos escuelas: "merge para que se vea cuándo se integró cada feature" o "rebase para que el historial sea lineal y limpio". No hay una respuesta universal: lo importante es que el equipo elija una y la respete.',
  },
  {
    id: 'm5-l5',
    title: 'Escenario: "Release v1.0.0 — cerrar el ciclo"',
    description:
      'Es el momento. Develop ya tiene todas las features que querías para la v1.0. Mergea develop a main, taggea la release como `v1.0.0` y deja el repo listo para el siguiente sprint.',
    objectives: [
      {
        label: 'Mergear develop a main (notifications.js llega a main)',
        validate: (s) => onBranch('main')(s) && fileOnBranch('notifications.js', 'main')(s),
      },
      {
        label: 'Etiquetar la release como v1.0.0',
        validate: hasTag('v1.0.0'),
      },
    ],
    hints: [
      'git switch main',
      'git merge develop',
      'git tag v1.0.0',
      'Comprueba: git log y git tag',
    ],
    curiosity:
      'SemVer (vMAYOR.MENOR.PATCH) marca un contrato con quien usa tu código: MAYOR rompe compatibilidad, MENOR añade sin romper, PATCH solo corrige. Por eso `v1.0.0` es psicológicamente tan importante: es la promesa pública de estabilidad.',
  },
];
