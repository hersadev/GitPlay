// Módulo 5 — Trabajo en equipo avanzado (7 lecciones)
// HEAD desacoplado, reflog (red de seguridad), rebase y GitFlow.

import {
  onBranch,
  hasBranch,
  lastCmd,
  lastArg,
  fileOnBranch,
  isDetached,
  rebaseInProgress,
  branchFileMatches,
  rebasedOnto,
} from '../_helpers';
import {
  DASHBOARD_JSX,
  METRICS_JS,
  NOTIFICATIONS_JS,
  PRECIOS_BASE,
  PRECIOS_TUYO,
  PRECIOS_COMPANERO,
} from './fixtures';

export const module4 = [
  {
    id: 'm4-l1',
    title: 'HEAD desacoplado: viajar al pasado',
    description:
      'Quieres revisar el código tal como estaba en v0.1.0, sin tocar nada. `git checkout <hash>` mueve HEAD directamente a un commit, sin rama por medio: el famoso "detached HEAD". Asusta la primera vez, pero es una operación de solo lectura perfectamente segura — y manejarla con soltura es marca de veterano.',
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
      'Volver a terreno seguro es tan simple como cambiarte a cualquier rama. La regla que hay que saberse: si hubieras commiteado en modo desacoplado, esos commits quedarían huérfanos al salir — se rescatan creando una rama desde ahí ANTES de irte (`git switch -c <nombre>`).',
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
      'El reflog es el diario privado de HEAD: registra TODOS sus movimientos — commits, checkouts, resets, merges, rebases. Lo que `git log` ya no muestra, el reflog lo recuerda durante ~90 días. Consúltalo: es la razón por la que casi ningún desastre local es definitivo.',
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
      'Simulacro de rescate: borra trabajo con `reset --hard`... y recupéralo. El reflog conserva el hash de donde estabas antes del destrozo; crea la rama `rescate` sobre ese hash y no se habrá perdido nada. Este movimiento te lo agradecerá tu yo del futuro.',
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
      'main avanzó mientras trabajabas en `feature/dashboard`. Un merge lo resolvería, pero dejaría commit de merge; la alternativa es `git rebase main`: reaplica tus commits encima de main, uno a uno, y la historia queda lineal — como si hubieras empezado hoy. Monta el escenario (los archivos ya están en el working directory) y rebasea tu rama.',
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
    id: 'm4-l5b',
    title: 'Rebase con conflicto: quédate con ambos',
    description:
      'El caso serio: tú añadiste el plan anual en `feature/precios` y tu compañero metió el enterprise en main, tocando las MISMAS líneas de `precios.js`. El rebase se parará a medio camino con marcadores `<<<<<<<`. Resuélvelo con el resolutor visual CONSERVANDO AMBOS planes y remata con `git rebase --continue`. Recuerda la trampa: en un rebase, HEAD es la rama base — o sea, el trabajo de tu compañero.',
    objectives: [
      {
        label: 'Cambiarte a feature/precios (tu rama, ya con tu commit)',
        validate: onBranch('feature/precios'),
      },
      {
        label: 'Rebasear sobre main y toparte con el conflicto',
        validate: (s) =>
          rebaseInProgress(s) ||
          branchFileMatches('feature/precios', 'precios.js', /enterprise/)(s),
      },
      {
        label: 'Conservar AMBOS cambios y completar con git rebase --continue',
        validate: (s) =>
          !rebaseInProgress(s) &&
          rebasedOnto('feature/precios', 'main')(s) &&
          branchFileMatches('feature/precios', 'precios.js', /enterprise/)(s) &&
          branchFileMatches('feature/precios', 'precios.js', /anual/)(s),
      },
    ],
    hints: [
      'git switch feature/precios',
      'git rebase main   → CONFLICTO en precios.js (se abre el resolutor visual)',
      'Pulsa "Conservar ambos": quieres el plan anual Y el enterprise',
      'El botón verde guarda y ejecuta git add por ti (también puedes: git add precios.js)',
      'git rebase --continue   → historia lineal con los dos planes',
    ],
    // Prepara el escenario: base común, tu commit en feature/precios y el del
    // compañero en main (idempotente: si la rama ya existe, no toca nada).
    setup: (engine) => {
      if (!engine.initialized) return;
      if (engine.branches.has('feature/precios')) return;
      if (!engine.branches.get('main')) return;
      engine.seedLocalCommit('main', {
        message: 'feat: tabla de precios',
        files: { 'precios.js': PRECIOS_BASE },
        author: 'Tú',
      });
      engine.seedBranch('feature/precios', 'main');
      engine.seedLocalCommit('feature/precios', {
        message: 'feat: plan anual con descuento',
        files: { 'precios.js': PRECIOS_TUYO },
        author: 'Tú',
      });
      engine.seedLocalCommit('main', {
        message: 'feat: plan enterprise',
        files: { 'precios.js': PRECIOS_COMPANERO },
        author: 'compañero',
      });
    },
    curiosity:
      'En un rebase las etiquetas se invierten: `<<<<<<< HEAD` es la rama base (¡el trabajo de tu compañero!) y `>>>>>>>` es TU commit reaplicado. Es al revés que en un merge y confunde hasta a gente con años de experiencia — por eso el resolutor te dice de quién es cada lado.',
  },
  {
    id: 'm4-l6',
    title: 'GitFlow: develop + feature branches',
    description:
      'GitFlow, el flujo clásico de los equipos grandes: `main` refleja producción, `develop` integra el trabajo diario y cada feature vive en su `feature/*` colgando de develop. Móntalo: crea develop, saca feature/notifications de ella, commitea y mergea de vuelta a develop. main ni se toca — queda reservada para releases.',
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
