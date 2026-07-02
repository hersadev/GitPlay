// Módulo 4 — Reescribir historia y releases (10 lecciones)
// Cosas que salen mal y cómo arreglarlas: resets, revert, stash, tags, cherry-pick.

import {
  onBranch,
  hasBranch,
  hasTag,
  lastCmd,
  lastArg,
  hasFileAnywhere,
  fileOnBranch,
  fileNotOnBranch,
  commitMsgMatches,
} from '../_helpers';
import {
  TASKS_JS,
  FILTERS_JS,
  GITIGNORE,
  NODE_MODULES,
  EXPERIMENTO_JS,
  API_JS,
  AUTH_FIX_JS,
} from './fixtures';

export const module3 = [
  {
    id: 'm3-l1',
    title: 'reset --soft: reescribir el último commit',
    description:
      'Hiciste un commit con un mensaje provisional ("wip: ..."). Quieres rehacer el commit con un mensaje decente sin perder los cambios. `git reset --soft HEAD~1` deshace el commit pero deja el staging tal cual.',
    objectives: [
      {
        label: 'Crear un commit con mensaje "wip: ..."',
        validate: commitMsgMatches(/^wip:/i),
      },
      {
        label: 'Deshacer ese commit con git reset --soft HEAD~1',
        validate: lastArg('reset', '--soft'),
      },
    ],
    hints: [
      'git add tasks.js',
      'git commit -m "wip: trabajando en la lista de tareas"',
      'git reset --soft HEAD~1',
      'Comprueba: el commit desaparece pero los archivos siguen en staging',
    ],
    setupFiles: { 'tasks.js': TASKS_JS },
    curiosity:
      'Cuando rehaces el último commit, también puedes usar `git commit --amend` para corregir mensaje o añadir archivos sin crear uno nuevo. De hecho, es la siguiente lección.',
  },
  {
    id: 'm3-l1b',
    title: 'commit --amend: el atajo para corregir',
    description:
      'Acabas de commitear los filtros de tareas con un mensaje pobre. En vez del rodeo con `reset --soft`, `git commit --amend -m "..."` reemplaza el último commit directamente: mismo contenido, mensaje nuevo. Ojo: cambia el hash, así que solo úsalo ANTES de hacer push.',
    objectives: [
      {
        label: 'Commitear filters.js (con cualquier mensaje)',
        validate: hasFileAnywhere('filters.js'),
      },
      {
        label: 'Reescribir el mensaje con git commit --amend',
        validate: lastArg('commit', '--amend'),
      },
    ],
    hints: [
      'git add filters.js',
      'git commit -m "cosas"   (el típico mensaje que luego da vergüenza)',
      'git commit --amend -m "feat: filtros de tareas por estado"',
      'Mira git log: hay UN solo commit de filtros, con el mensaje nuevo y otro hash',
    ],
    setupFiles: { 'filters.js': FILTERS_JS },
    curiosity:
      '`--amend` también sirve para añadir archivos olvidados: haz `git add` de lo que faltó y repite `git commit --amend`. Si omites el -m, se conserva el mensaje original (en Git real eso es `--no-edit`). El commit antiguo no se borra al instante: queda huérfano y el reflog lo recuerda.',
  },
  {
    id: 'm3-l2',
    title: 'reset --mixed: sacar algo del staging',
    description:
      'Añadiste `node_modules` al staging por error. No lo quieres en el commit. `git reset` (modo por defecto `--mixed`) vacía el staging pero conserva los archivos.',
    objectives: [
      {
        label: 'Tener node_modules en el staging (simula el error)',
        validate: (s) => s.stagingArea.has('node_modules') || lastArg('reset', '--mixed')(s),
      },
      {
        label: 'Limpiar el staging con git reset --mixed',
        validate: lastArg('reset', '--mixed'),
      },
    ],
    hints: [
      'git add node_modules',
      'git reset --mixed    (o simplemente: git reset, --mixed es el defecto)',
      'Recuerda añadir node_modules al .gitignore en proyectos reales',
    ],
    setupFiles: { 'node_modules': NODE_MODULES },
    curiosity:
      'El .gitignore solo ignora archivos que aún no están trackeados. Si ya commiteaste algo por error (como node_modules), tienes que sacarlo del index con `git rm --cached <archivo>` además de añadirlo al .gitignore.',
  },
  {
    id: 'm3-l2b',
    title: '.gitignore: que no vuelva a colarse',
    description:
      'Sacaste node_modules del staging, pero el error se repetirá salvo que se lo digas a Git de forma permanente. El archivo `.gitignore` lista lo que Git debe ignorar: dependencias, builds, logs. Ya lo tienes preparado en el working directory — commitéalo y comprueba que node_modules desaparece de `git status`.',
    objectives: [
      {
        label: 'node_modules fuera del staging y sin commitear',
        validate: (s) => !s.stagingArea.has('node_modules') && !hasFileAnywhere('node_modules')(s),
      },
      {
        label: 'Commitear el archivo .gitignore',
        validate: fileOnBranch('.gitignore', 'main'),
      },
      {
        label: 'Verificar con git status que node_modules ya no aparece',
        validate: lastCmd('status'),
      },
    ],
    hints: [
      'Abre .gitignore en el panel derecho: la primera regla es "node_modules"',
      'git add .gitignore   (o git add . — fíjate: node_modules ya NO entra)',
      'git commit -m "chore: añadir .gitignore"',
      'git status → node_modules ya no sale como "sin seguimiento"',
      'Prueba git add node_modules: ahora Git se niega',
    ],
    setupFiles: { '.gitignore': GITIGNORE, 'node_modules': NODE_MODULES },
    curiosity:
      'Cada línea del .gitignore es un patrón: `*.log` ignora todos los logs, `dist/` una carpeta entera, y `!importante.log` (con exclamación) crea una excepción. En gitignore.io hay plantillas listas para cada lenguaje y editor.',
  },
  {
    id: 'm3-l3',
    title: 'reset --hard: descartar un experimento',
    description:
      'Probaste algo en `experimento.js`, lo commiteaste, y decides que no quieres conservarlo. `git reset --hard HEAD~1` borra el commit Y los archivos. Cuidado: solo el reflog puede recuperarlo (lo veremos en el módulo 4).',
    objectives: [
      {
        label: 'Crear un commit con experimento.js',
        validate: hasFileAnywhere('experimento.js'),
      },
      {
        label: 'Descartar el commit con git reset --hard HEAD~1',
        validate: (s) =>
          lastArg('reset', '--hard')(s) && fileNotOnBranch('experimento.js', s.HEAD)(s),
      },
    ],
    hints: [
      'git add experimento.js',
      'git commit -m "test: probando algo"',
      'git reset --hard HEAD~1',
      '⚠️ El commit queda fuera del historial activo',
    ],
    setupFiles: { 'experimento.js': EXPERIMENTO_JS },
    curiosity:
      'Aunque hagas `reset --hard`, Git no borra el commit de inmediato: queda como "huérfano" y el recolector de basura (`git gc`) lo eliminará pasados unos 30-90 días. Por eso el reflog puede salvarte la vida si lo notas a tiempo.',
  },
  {
    id: 'm3-l4',
    title: 'revert: deshacer sin reescribir historia',
    description:
      'Si un commit problemático ya está en una rama compartida (main), no puedes hacer reset: romperías el historial de los demás. `git revert <hash>` crea un nuevo commit que invierte los cambios. Es la forma segura de deshacer en remoto.',
    objectives: [
      {
        label: 'Usar git revert sobre un commit',
        validate: lastCmd('revert'),
      },
      {
        label: 'El revert creó un commit "Revert ..."',
        validate: commitMsgMatches(/^Revert /),
      },
    ],
    hints: [
      'Mira los hashes: git log',
      'Escoge uno: git revert <hash>',
      'Se crea un nuevo commit que deshace los cambios del original',
    ],
    curiosity:
      'En equipos con muchos contribuidores, la regla de oro es: si tu commit ya está en remoto, NO se reescribe nunca (nada de reset ni rebase). Para deshacerlo usas revert, que mantiene la historia intacta para los demás.',
  },
  {
    id: 'm3-l5',
    title: 'stash: guardar trabajo a medias',
    description:
      'Estás a medias añadiendo `api.js`, sin terminar. De repente tienes que cambiar de tarea. `git stash` guarda los cambios en una pila y deja el workspace limpio.',
    objectives: [
      {
        label: 'Tener api.js en el staging (o ya guardado)',
        validate: (s) => s.stagingArea.has('api.js') || s.stash.length > 0,
      },
      {
        label: 'Guardar el trabajo con git stash',
        validate: (s) => s.stash.length > 0,
      },
    ],
    hints: ['git add api.js', 'git stash', 'Tu staging queda vacío, pero el trabajo está a salvo'],
    setupFiles: { 'api.js': API_JS },
    curiosity:
      'El stash es una pila (LIFO): el último que guardas es el primero que sacas. Puedes ponerle nombre con `git stash push -m "mensaje"` y ver la pila con `git stash list` para no perderte entre varios.',
  },
  {
    id: 'm3-l6',
    title: 'stash pop: retomar el trabajo',
    description:
      'La urgencia se resolvió. Recupera lo que tenías a medias con `git stash pop`: restaura los cambios y elimina la entrada del stash.',
    objectives: [
      {
        label: 'Tener algo en el stash (o recién recuperado)',
        validate: (s) => s.stash.length > 0 || lastArg('stash', 'pop')(s),
      },
      {
        label: 'Recuperar con git stash pop',
        validate: lastArg('stash', 'pop'),
      },
    ],
    hints: ['git stash pop', 'Si tienes varios stashes: git stash list para verlos'],
    curiosity:
      '`pop` aplica el stash y lo elimina; `apply` lo aplica pero lo conserva. Útil cuando quieres probar el mismo stash en varias ramas sin perderlo en el camino.',
  },
  {
    id: 'm3-l7',
    title: 'tag v0.1.0: marcar el primer release',
    description:
      'TaskFlow ya tiene login y dark-mode integrados en main. Es momento del primer release. Los tags son referencias fijas a un commit — la convención SemVer es `vMAYOR.MENOR.PATCH`.',
    objectives: [
      {
        label: 'Etiquetar el commit actual como v0.1.0',
        validate: hasTag('v0.1.0'),
      },
    ],
    hints: [
      'Asegúrate de estar en main: git switch main',
      'git tag v0.1.0',
      'Verifica: git tag',
    ],
    curiosity:
      'Hay dos tipos de tag: los "lightweight" (solo un nombre apuntando a un commit, como `git tag v0.1.0`) y los "annotated" (`git tag -a v0.1.0 -m "..."`), que guardan autor, fecha y mensaje. Para releases reales se recomiendan los annotated.',
  },
  {
    id: 'm3-l8',
    title: 'cherry-pick: portar un fix concreto',
    description:
      'Encontraste un bug de auth en la rama `feature/api` y lo arreglaste ahí. Quieres ese fix YA en main, pero sin mergear toda la rama. `git cherry-pick <hash>` copia ese commit concreto.',
    objectives: [
      {
        label: 'Tener feature/api con un commit que añada auth-fix.js',
        validate: (s) => hasBranch('feature/api')(s) && fileOnBranch('auth-fix.js', 'feature/api')(s),
      },
      {
        label: 'Aplicar el fix a main con cherry-pick',
        validate: (s) => onBranch('main')(s) && fileOnBranch('auth-fix.js', 'main')(s),
      },
    ],
    hints: [
      'git switch -c feature/api',
      'git add auth-fix.js && git commit -m "fix: validar token JWT expirado"',
      'Anota el hash: git log',
      'git switch main',
      'git cherry-pick <hash>',
    ],
    setupFiles: { 'auth-fix.js': AUTH_FIX_JS },
    curiosity:
      'Cherry-pick acepta rangos (`git cherry-pick A..B`) y también varios commits a la vez. Si hay conflictos, lo pausa para que los resuelvas y luego continúas con `git cherry-pick --continue`.',
  },
];
