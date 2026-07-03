// Módulo "Trabajar con GitHub" (7 lecciones).
// Aprende push/pull/fetch y el flujo de Pull Requests en una repo simulado.

import {
  onBranch,
  hasBranch,
  fileOnBranch,
  branchOnRemote,
  branchSynced,
  hasOpenPR,
  hasMergedPR,
  mergeResolved,
} from '../_helpers';
import {
  PROFILE_JSX,
  README_BASE,
  README_TEAMMATE_EDIT,
  FEATURE_FLAGS_JS,
  DARK_TOGGLE_JS,
} from './fixtures';

export const moduleGithub = [
  {
    id: 'gh-l1',
    title: 'Tu primer push a origin',
    description:
      'Hasta ahora todo pasaba en tu máquina. GitHub guarda una copia del repositorio en la nube — el "remoto", que por convención se llama `origin` — para poder compartirla con tu equipo. `git push origin main` sube tus commits por primera vez. Verás aparecer `origin/main` en el grafo (borde discontinuo): así recuerda tu repo local dónde está el remoto.',
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
      '`git push` sube todos tus commits, estén firmados o no. Si los firmas con GPG o SSH, GitHub muestra el "Verified" en verde al lado del commit cuando valida la firma en su lado — muchos proyectos abiertos lo exigen para aceptar contribuciones.',
  },

  {
    id: 'gh-l2',
    title: 'Pushear una feature branch',
    description:
      'Implementaste la pantalla de perfil en `feature/profile` — crear la rama y commitear ya es rutina para ti. Lo nuevo: para poder abrir una Pull Request, la rama tiene que existir en el remoto. Pushéala a origin.',
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
      'Con la rama en origin, abre la vista de GitHub (botón 🐙 de la cabecera) y crea una Pull Request de `feature/profile` hacia `main`. La PR es la propuesta formal — "quiero meter estos commits en main" — y el lugar donde el equipo revisa tu código antes de integrarlo.',
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
      'Tu PR ya tiene aprobación (en la vida real serían tus compañeros revisando). Ve a la vista de GitHub, abre el PR y pulsa "Merge PR". Fíjate bien en el grafo después: el merge ocurre en el remoto — tu copia local todavía no se entera.',
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
      'El merge del PR ocurrió en GitHub, así que tu main local se quedó atrás. `git pull` trae los commits nuevos del remoto y los integra en tu rama actual (por debajo son dos pasos: `git fetch` + `git merge`). Sincronízate.',
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
      'Tu compañera modificó el `README.md` y mergeó su PR. Mientras tanto, tú también lo editaste en local. Al hacer `git pull` los dos cambios chocan: te toca resolver tu primer conflicto y subir el resultado con `git push`. Tranquilidad — un conflicto no es un error, es Git pidiéndote que decidas tú.',
    objectives: [
      { label: 'Tienes un commit local que toca README.md', validate: (s) => fileOnBranch('README.md', 'main')(s) },
      { label: 'Conflicto resuelto y pusheado (main sincronizado con origin)', validate: (s) => mergeResolved(s) && branchSynced('main')(s) },
    ],
    hints: [
      'Edita el README.md (pulsa sobre el archivo en el panel derecho → Editar) y haz un commit local',
      'git pull   (verás "CONFLICTO" en README.md y se abrirá el resolutor visual)',
      'Elige con los botones qué conservar (los tuyos, los del compañero o ambos) y pulsa "Guardar y marcar resuelto" — hace el git add por ti',
      'También puedes hacerlo a mano: quitar los marcadores <<<<<<< ======= >>>>>>> y git add README.md',
      'git commit   (concluye el merge; el mensaje es opcional)',
      'git push   (sube el merge: main y origin/main vuelven a estar iguales)',
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
      'El examen del módulo: el ciclo completo, tú solo. Mientras implementas el toggle de tema en una rama, tu compañero mete `feature-flags.js` en main. Tu objetivo: ramificar, commitear, pushear, abrir la PR, mergearla y dejar tu main local sincronizado con todo.',
    objectives: [
      { label: 'Tienes una rama feature/dark-toggle con tu commit (darkToggle.js)', validate: fileOnBranch('darkToggle.js', 'feature/dark-toggle') },
      { label: 'feature/dark-toggle está en origin', validate: branchOnRemote('feature/dark-toggle') },
      { label: 'Existe un PR mergeado de feature/dark-toggle → main', validate: hasMergedPR('feature/dark-toggle', 'main') },
      { label: 'main local sincronizado con origin/main', validate: branchSynced('main') },
    ],
    hints: [
      '1) Crea la rama y commitea: git switch -c feature/dark-toggle && git add darkToggle.js && git commit -m "feat: toggle de tema"',
      '2) Súbela: git push origin feature/dark-toggle',
      '3) Abre y mergea el PR en la vista de GitHub (🐙)',
      '4) Vuelve a main y trae los cambios: git switch main && git pull',
    ],
    setupFiles: { 'darkToggle.js': DARK_TOGGLE_JS },
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
