// Módulo "Trabajar con GitHub" (7 lecciones).
// Aprende push/pull/fetch y el flujo de Pull Requests en una repo simulado.

import {
  onBranch,
  hasBranch,
  lastCmd,
  lastArg,
  fileOnBranch,
  branchOnRemote,
  branchSynced,
  hasRemoteRef,
  hasOpenPR,
  hasMergedPR,
  mergeResolved,
} from '../_helpers';
import {
  PROFILE_JSX,
  README_BASE,
  README_LOCAL_EDIT,
  README_TEAMMATE_EDIT,
  FEATURE_FLAGS_JS,
} from './fixtures';

export const moduleGithub = [
  {
    id: 'gh-l1',
    title: 'Tu primer push a origin',
    description:
      'Tienes tu repo local, pero todavía no está en GitHub. `git push origin main` sube tus commits al remoto por primera vez. Verás aparecer la etiqueta `origin/main` en el grafo (con borde discontinuo).',
    objectives: [
      { label: 'Estar en main con al menos un commit', validate: (s) => onBranch('main')(s) && s.branches.get('main') },
      { label: 'Hacer push de main a origin', validate: branchOnRemote('main') },
    ],
    hints: [
      'git push origin main   (o simplemente: git push)',
      'En GitHub real, la primera vez se suele hacer `git push -u origin main` para fijar el upstream',
    ],
    setupFiles: { 'README.md': README_BASE },
    curiosity:
      'En proyectos abiertos, `git push` solo sube commits firmados por ti. GitHub muestra el "Verified" en verde al lado del commit cuando la clave GPG/SSH se valida en su lado.',
  },

  {
    id: 'gh-l2',
    title: 'Pushear una feature branch',
    description:
      'Implementaste la pantalla de perfil en `feature/profile`. Para abrir un PR primero hay que pushear esa rama a origin.',
    objectives: [
      { label: 'Crear la rama feature/profile', validate: hasBranch('feature/profile') },
      { label: 'Commitear Profile.jsx en feature/profile', validate: fileOnBranch('Profile.jsx', 'feature/profile') },
      { label: 'Pushear feature/profile a origin', validate: branchOnRemote('feature/profile') },
    ],
    hints: [
      'git switch -c feature/profile',
      'git add Profile.jsx && git commit -m "feat: pantalla de perfil"',
      'git push origin feature/profile',
    ],
    setupFiles: { 'Profile.jsx': PROFILE_JSX },
    curiosity:
      'GitHub solo te deja abrir un PR desde una rama que esté pusheada. Por eso `push` y `pull request` van casi siempre seguidos en el flujo real.',
  },

  {
    id: 'gh-l3',
    title: 'Abrir tu primera Pull Request',
    description:
      'Con la rama pusheada, abre la vista de GitHub (botón 🐙 del header) y crea una Pull Request de `feature/profile` hacia `main`. Es la propuesta formal: "quiero meter estos commits en main".',
    objectives: [
      { label: 'feature/profile está en origin', validate: branchOnRemote('feature/profile') },
      { label: 'Hay un PR abierto de feature/profile → main', validate: hasOpenPR('feature/profile', 'main') },
    ],
    hints: [
      'Abre la vista de GitHub con el botón 🐙 del header',
      'Pulsa "New Pull Request"',
      'De rama: feature/profile · A rama: main',
    ],
    curiosity:
      'En equipos sanos, el PR es donde de verdad ocurre el code review: comentarios línea a línea, sugerencias, y la conversación queda guardada para siempre como contexto del proyecto.',
  },

  {
    id: 'gh-l4',
    title: 'Mergear el PR en GitHub',
    description:
      'Tu PR ya tiene aprobación (en la vida real serían tus compañeros revisando). Vete a la vista de GitHub, abre el PR y pulsa "Merge PR". El merge ocurre en el remoto, no en tu copia local.',
    objectives: [
      { label: 'Existe un PR abierto de feature/profile → main', validate: (s) => hasOpenPR('feature/profile', 'main')(s) || hasMergedPR('feature/profile', 'main')(s) },
      { label: 'PR mergeado en main', validate: hasMergedPR('feature/profile', 'main') },
    ],
    hints: [
      'Abre la vista de GitHub (🐙)',
      'Pulsa el PR y luego "Merge PR"',
      'Verás que origin/main avanza pero tu main local sigue en el commit anterior',
    ],
    curiosity:
      'Tras mergear, GitHub puede borrar automáticamente la rama del PR (opción "Delete branch"). En este simulador la dejamos para que veas la diferencia entre rama local y remota.',
  },

  {
    id: 'gh-l5',
    title: 'Sincronizar local con git pull',
    description:
      'Tu rama main local está desactualizada: el merge ocurrió en GitHub. `git pull` trae los commits del remoto y los integra en tu rama actual.',
    objectives: [
      { label: 'Estar en main', validate: onBranch('main') },
      { label: 'main local sincronizado con origin/main', validate: branchSynced('main') },
    ],
    hints: [
      'git switch main',
      'git pull   (equivale a: git fetch + git merge origin/main)',
      'Como el remoto solo avanzó, es un fast-forward limpio',
    ],
    curiosity:
      'Si haces `git pull --rebase` en vez del pull normal, en lugar de crear un merge commit Git reaplica tus commits locales encima del remoto. Muchos equipos lo prefieren para mantener la historia lineal.',
  },

  {
    id: 'gh-l6',
    title: 'Conflicto al pullear',
    description:
      'Tu compañera modificó el `README.md` y mergeó su PR. Mientras tanto, tú también lo editaste localmente. Al hacer `git pull` chocaréis: tendrás que resolver el conflicto a mano.',
    objectives: [
      { label: 'Tienes un commit local que toca README.md', validate: (s) => fileOnBranch('README.md', 'main')(s) },
      { label: 'Después de pullear, el merge está resuelto (sin marcadores)', validate: (s) => mergeResolved(s) && branchSynced('main')(s) },
    ],
    hints: [
      'Edita el README.md (pulsa sobre el archivo en el panel derecho → Editar) y haz un commit local',
      'git pull   (verás "CONFLICTO" en README.md)',
      'Abre README.md, quita los marcadores <<<<<<<, =======, >>>>>>> y guarda',
      'git add README.md && git commit   (resuelve el merge)',
    ],
    setupFiles: { 'README.md': README_BASE },
    setup: (engine) => {
      // Asegúrate de que el README ya esté en main local y en origin/main como en gh-l1.
      // Luego "el compañero" mergea una versión distinta en remoto.
      engine.seedRemoteCommit('main', {
        message: 'docs: aclarar que es open-source',
        files: { 'README.md': README_TEAMMATE_EDIT },
        author: 'compañero',
      });
    },
    curiosity:
      'En Git el conflicto NO es un error de Git, es una situación que ocurre cuando dos personas tocan las mismas líneas. Git no decide por ti: solo te pone los dos lados y espera tu decisión.',
  },

  {
    id: 'gh-l7',
    title: 'Workflow completo: feature → PR → merge → pull',
    description:
      'Aplica todo el ciclo end-to-end. Tu compañero añadió `feature-flags.js` a main mientras tú implementabas algo en una rama. Tu objetivo: ramificar, commitear, pushear, abrir PR, mergearlo y dejar tu local sincronizado.',
    objectives: [
      { label: 'Tienes una rama feature/dark-toggle con commit', validate: (s) => hasBranch('feature/dark-toggle')(s) && s.branches.get('feature/dark-toggle') },
      { label: 'feature/dark-toggle está en origin', validate: branchOnRemote('feature/dark-toggle') },
      { label: 'Existe un PR mergeado de feature/dark-toggle → main', validate: hasMergedPR('feature/dark-toggle', 'main') },
      { label: 'main local sincronizado con origin/main', validate: branchSynced('main') },
    ],
    hints: [
      '1) Crea la rama y commitea un archivo: git switch -c feature/dark-toggle / git add / git commit',
      '2) Súbela: git push origin feature/dark-toggle',
      '3) Abre y mergea el PR en la vista de GitHub (🐙)',
      '4) Vuelve a main y trae los cambios: git switch main && git pull',
    ],
    setup: (engine) => {
      // El "compañero" mete feature-flags.js en main (después de un push inicial del alumno).
      // Si la rama main aún no está en origin, no hace nada (idempotente).
      engine.seedRemoteCommit('main', {
        message: 'feat: feature flags básicos',
        files: { 'feature-flags.js': FEATURE_FLAGS_JS },
        author: 'compañero',
      });
    },
    curiosity:
      'En GitHub Flow (más simple que GitFlow), TODO se hace contra main: ramas cortas, PRs frecuentes y despliegue continuo. Es el flujo que usan GitHub, Shopify, Basecamp y muchas startups.',
  },
];
