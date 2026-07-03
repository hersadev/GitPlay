// Módulo 6 — Escenarios reales (5 lecciones)
// Situaciones que aparecen en proyectos de verdad. Cada lección es un caso completo.

import {
  onBranch,
  hasBranch,
  hasTag,
  fileOnBranch,
  fileNotOnBranch,
  hasFileAnywhere,
  rebasedOnto,
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
      'Situación: commiteaste un experimento directamente en main. Debería estar en su propia rama, y main debería quedar como si nada hubiera pasado. Tienes todas las piezas — una rama puede nacer del commit actual, y `reset --hard` sabe rebobinar. Solo el orden es delicado: primero pon el trabajo a salvo, luego borra.',
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
      'La v1.0 está en producción en `release/1.0` y main sigue su vida. Arreglaste un fallo de CSRF en main y producción lo necesita YA — pero mergear main entera arrastraría trabajo a medio hacer. Solo debe viajar ese commit concreto, y tú ya sabes qué comando hace exactamente eso.',
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
      'Querías rebobinar 1 commit y rebobinaste 3. A cualquiera se le para el corazón — pero tú ya sabes que en Git casi nada muere de verdad. Demuéstralo: localiza el estado perdido y ponlo a salvo en una rama llamada `salvado`.',
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
      'El clásico de todos los lunes: llevas días en `feature/payments` y main avanzó por debajo. La quieres integrar con historia lineal, sin commit de merge. Rebase primero, merge fast-forward después — el combo que ya dominas, ahora de principio a fin.',
    objectives: [
      {
        label: 'Tener feature/payments con Payments.jsx',
        validate: fileOnBranch('Payments.jsx', 'feature/payments'),
      },
      {
        // Estado del grafo, no último comando: el objetivo 3 obliga a cambiar a
        // main, y con lastCmd el rebase se "desmarcaba" al hacer git switch.
        label: 'Rebasear feature/payments sobre main',
        validate: rebasedOnto('feature/payments', 'main'),
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
      'La última: develop ya tiene todo lo prometido para la v1.0. Cierra el ciclo como se cierra en un equipo real — integra develop en main, marca la release con su tag SemVer `v1.0.0` y deja el repo listo para el siguiente sprint. Aquí no hay nada que no hayas hecho ya.',
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
