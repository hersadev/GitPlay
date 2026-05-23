// Módulo 4 — Trabajo en equipo (6 lecciones)
// HEAD desacoplado, reflog (red de seguridad), rebase y GitFlow.

import {
  onBranch,
  hasBranch,
  lastCmd,
  lastArg,
  fileOnBranch,
  isDetached,
} from '../_helpers';
import { DASHBOARD_JSX, METRICS_JS, NOTIFICATIONS_JS } from './fixtures';

export const module4 = [
  {
    id: 'm4-l1',
    title: 'HEAD desacoplado: viajar al pasado',
    description:
      'Quieres revisar cómo estaba el código en v0.1.0 sin modificar nada. Haz `git checkout <hash>` para moverte a ese commit: HEAD queda "desacoplado" (no apunta a ninguna rama). Es solo lectura segura.',
    objectives: [
      {
        label: 'Moverte a un commit antiguo (HEAD desacoplado)',
        validate: isDetached,
      },
    ],
    hints: [
      'Busca el hash del commit de v0.1.0 con: git log',
      'Luego: git checkout <hash>',
      'Verás "HEAD desacoplado en ..."',
    ],
    curiosity:
      'En modo desacoplado puedes hacer commits, pero como no estás en una rama, esos commits no quedan "anclados" a nada. Si te vas a otra rama sin crear una nueva desde ahí, los pierdes (aunque el reflog aún los conserve un tiempo).',
  },
  {
    id: 'm4-l2',
    title: 'Salir del HEAD desacoplado',
    description:
      'Para volver a un estado seguro, cámbiate a cualquier rama. Si hubieras hecho commits en modo desacoplado y quisieras conservarlos, primero crearías una rama desde ahí (`git switch -c <nombre>`).',
    objectives: [
      {
        label: 'Volver a una rama nombrada (no desacoplado)',
        validate: (s) => s.branches.has(s.HEAD),
      },
    ],
    hints: ['git switch main', 'Para guardar trabajo desde detached: git switch -c rama-nueva'],
    curiosity:
      'Cuando sales de un HEAD desacoplado tras hacer commits, Git suele avisarte explícitamente con un mensaje del tipo "you are leaving … commits behind" e incluso te sugiere el comando exacto para crear una rama y salvarlos.',
  },
  {
    id: 'm4-l3',
    title: 'reflog: la red de seguridad de Git',
    description:
      'El reflog registra TODOS los movimientos de HEAD: commits, checkouts, resets, merges. Aunque borres commits con `reset --hard`, el reflog los conserva durante 90 días.',
    objectives: [
      { label: 'Consultar el reflog', validate: lastCmd('reflog') },
    ],
    hints: ['git reflog', 'Verás una entrada por cada movimiento, con su hash'],
    curiosity:
      'El reflog es LOCAL: vive en `.git/logs/` y no se sube al remoto. Por eso si clonas un repo en otra máquina no verás los movimientos previos, solo los que hagas tú a partir de ese clone.',
  },
  {
    id: 'm4-l4',
    title: 'Recuperar commits con reflog',
    description:
      'Imagina que hiciste un `reset --hard HEAD~2` y borraste por error dos commits importantes. El reflog te muestra el hash que tenías antes — crea una rama desde ahí y los recuperas.',
    objectives: [
      {
        label: 'El reflog tiene entradas de reset (simulaste pérdida en algún momento)',
        validate: (s) => s.reflog.some((e) => e.message?.startsWith('reset:')),
      },
      {
        label: 'Crear una rama "rescate" para recuperar',
        validate: hasBranch('rescate'),
      },
    ],
    hints: [
      'Para simular pérdida: git reset --hard HEAD~1',
      'Mira el hash anterior: git reflog',
      'Recupéralo: git branch rescate <hash>',
      'Luego: git switch rescate',
    ],
    curiosity:
      'Cada entrada del reflog tiene una notación tipo `HEAD@{2}`, que significa "donde estaba HEAD hace 2 movimientos". También funciona con tiempo: `HEAD@{yesterday}` te lleva a donde estabas ayer.',
  },
  {
    id: 'm4-l5',
    title: 'rebase: linealizar feature/dashboard',
    description:
      'Tu compañero metió commits en main mientras tú trabajabas en `feature/dashboard`. Antes de mergear, rebasear tu rama "encima" de main produce una historia lineal, sin commit de merge.',
    objectives: [
      {
        label: 'Tener feature/dashboard con Dashboard.jsx',
        validate: fileOnBranch('Dashboard.jsx', 'feature/dashboard'),
      },
      {
        label: 'Hacer un rebase desde feature/dashboard',
        validate: (s) => onBranch('feature/dashboard')(s) && lastCmd('rebase')(s),
      },
    ],
    hints: [
      'git switch -c feature/dashboard',
      'git add Dashboard.jsx && git commit -m "feat: dashboard inicial"',
      'Simula avance de main: git switch main && git add metrics.js && git commit -m "feat: métricas"',
      'git switch feature/dashboard && git rebase main',
    ],
    setupFiles: { 'Dashboard.jsx': DASHBOARD_JSX, 'metrics.js': METRICS_JS },
    curiosity:
      'Rebase no "mueve" commits: los reescribe uno a uno encima de la otra rama, generando hashes nuevos. Por eso nunca debes rebasear commits que ya estén en remoto compartido (les cambia la identidad a los demás).',
  },
  {
    id: 'm4-l6',
    title: 'GitFlow: develop + feature branches',
    description:
      'GitFlow organiza el trabajo en ramas estables: `main` (producción), `develop` (integración continua), `feature/*` (cada nueva feature). Las features se mergean a develop, no a main directamente.',
    objectives: [
      { label: 'Crear la rama develop', validate: hasBranch('develop') },
      {
        label: 'Crear feature/notifications desde develop',
        validate: hasBranch('feature/notifications'),
      },
      {
        label: 'Mergear feature/notifications a develop',
        validate: (s) => onBranch('develop')(s) && fileOnBranch('notifications.js', 'develop')(s),
      },
    ],
    hints: [
      'git switch main && git switch -c develop',
      'git switch -c feature/notifications',
      'git add notifications.js && git commit -m "feat: notificaciones in-app"',
      'git switch develop && git merge feature/notifications',
    ],
    setupFiles: { 'notifications.js': NOTIFICATIONS_JS },
    curiosity:
      'GitFlow fue formalizado por Vincent Driessen en 2010 y se hizo enormemente popular. Hoy muchos equipos prefieren alternativas más simples como "Trunk-based development" o "GitHub Flow", sobre todo en proyectos con despliegue continuo.',
  },
];
