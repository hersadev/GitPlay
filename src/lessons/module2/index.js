// Módulo 2 — Features en ramas (8 lecciones)
// Implementas login y dark-mode en ramas separadas, las listas, mergeas y limpias.

import {
  onBranch,
  hasBranch,
  lastCmd,
  fileOnBranch,
  hasMergeInBranch,
} from '../_helpers';
import { LOGIN_JSX, DARK_MODE_JS, SETTINGS_JS, CHANGELOG_MD } from './fixtures';

export const module2 = [
  {
    id: 'm2-l1',
    title: 'Tu primera rama: feature/login',
    description:
      'Todo tu trabajo vive de momento en `main`, la rama principal. Una rama es una línea de trabajo paralela: te deja desarrollar algo con calma sin tocar lo que ya funciona. El login va a llevar su tiempo, así que dale su propia rama con `git branch feature/login` y mira cómo aparece la etiqueta nueva en el grafo.',
    objectives: [
      {
        label: 'Crear la rama feature/login',
        validate: hasBranch('feature/login'),
      },
    ],
    hints: ['git branch feature/login', 'Verifica con: git branch'],
    curiosity:
      'Una rama en Git no es una copia del código: es solo un fichero de 41 bytes con el hash del último commit. Por eso crear ramas es prácticamente instantáneo, da igual el tamaño del proyecto.',
  },
  {
    id: 'm2-l2',
    title: 'Cambiarte a feature/login',
    description:
      'Crear la rama no te ha movido a ella: sigues en main. El puntero que marca dónde estás se llama HEAD (fíjate en el grafo). Entra en la rama con `git switch feature/login` — a partir de ese momento tus commits irán a parar ahí.',
    objectives: [
      { label: 'Estar en feature/login', validate: onBranch('feature/login') },
    ],
    hints: ['git switch feature/login', 'Alternativa antigua: git checkout feature/login'],
    curiosity:
      '`git switch` y `git restore` aparecieron en Git 2.23 (agosto de 2019) para dividir el caótico `git checkout`, que servía tanto para cambiar de rama como para descartar cambios. Hoy se recomienda usarlos en lugar de checkout.',
  },
  {
    id: 'm2-l3',
    title: 'Commit del formulario en feature/login',
    description:
      'Ya estás dentro. Ahora trabaja igual que en el módulo 1: añade `Login.jsx` y commitea. La diferencia está en dónde queda el commit: solo en feature/login. Mira el grafo — main se queda quieta, ajena a todo, hasta que tú decidas fusionar (eso llegará en un par de lecciones).',
    objectives: [
      { label: 'Estar en feature/login', validate: onBranch('feature/login') },
      {
        label: 'Commitear Login.jsx en feature/login',
        validate: fileOnBranch('Login.jsx', 'feature/login'),
      },
    ],
    hints: [
      'git add Login.jsx',
      'git commit -m "feat: formulario de login"',
      'Comprueba: git log (verás el commit solo en esta rama)',
    ],
    setupFiles: { 'Login.jsx': LOGIN_JSX },
    curiosity:
      'HEAD es un puntero al "commit actual". Normalmente apunta a una rama (que a su vez apunta a un commit), pero también puede apuntar directamente a un commit: eso es el famoso "HEAD desacoplado".',
  },
  {
    id: 'm2-l4',
    title: 'Crear y cambiar en un paso (feature/dark-mode)',
    description:
      'Toca otra feature: el modo oscuro. Crear una rama y entrar en ella es tan habitual que existe un atajo, `git switch -c <rama>`, que hace las dos cosas de golpe. Eso sí: vuelve primero a main, para que la rama nueva nazca de ahí y no de feature/login.',
    objectives: [
      {
        label: 'Tener la rama feature/dark-mode',
        validate: hasBranch('feature/dark-mode'),
      },
      {
        label: 'Estar en feature/dark-mode',
        validate: onBranch('feature/dark-mode'),
      },
      {
        label: 'Commitear darkMode.js en feature/dark-mode',
        validate: fileOnBranch('darkMode.js', 'feature/dark-mode'),
      },
    ],
    hints: [
      'Vuelve a main primero si no estás: git switch main',
      'git switch -c feature/dark-mode',
      'git add darkMode.js',
      'git commit -m "feat: alternador de modo oscuro"',
    ],
    setupFiles: { 'darkMode.js': DARK_MODE_JS },
    curiosity:
      'La barra "/" en `feature/dark-mode` no crea carpetas en tu proyecto: en el working directory no cambia nada. Pero dentro de `.git/refs/heads/` sí crea una carpeta real — por eso no puedes tener a la vez una rama `feature` y otra `feature/algo`. Muchas herramientas (GitHub, GitKraken…) además aprovechan esa convención para mostrar las ramas en árbol.',
  },
  {
    id: 'm2-l5',
    title: 'La forma clásica: git checkout -b (feature/settings)',
    description:
      'Antes de que existiera `git switch`, crear-y-entrar se hacía con `git checkout -b <rama>`. Hace exactamente lo mismo y te la cruzarás en miles de tutoriales y respuestas de Stack Overflow, así que conviene reconocerla. Practícala creando la pantalla de ajustes.',
    objectives: [
      {
        label: 'Crear la rama feature/settings con checkout -b',
        validate: hasBranch('feature/settings'),
      },
      {
        label: 'Estar en feature/settings',
        validate: onBranch('feature/settings'),
      },
      {
        label: 'Commitear settings.js en feature/settings',
        validate: fileOnBranch('settings.js', 'feature/settings'),
      },
    ],
    hints: [
      'Vuelve a main primero si no estás: git switch main',
      'git checkout -b feature/settings   (equivale a git switch -c)',
      'git add settings.js',
      'git commit -m "feat: pantalla de ajustes"',
    ],
    setupFiles: { 'settings.js': SETTINGS_JS },
    curiosity:
      '`git checkout -b` y `git switch -c` hacen exactamente lo mismo: crear la rama y mover HEAD a ella. `switch` (Git 2.23, 2019) nació para separar responsabilidades del sobrecargado `checkout`, que también sirve para descartar cambios o poner HEAD desacoplado. Por eso hoy se recomienda `switch` en código y material nuevo, aunque `checkout -b` no está deprecado.',
  },
  {
    id: 'm2-l6',
    title: 'Listar las ramas',
    description:
      'Con tres features en marcha es fácil despistarse de dónde estás. `git branch` a secas no crea nada: lista todas tus ramas locales y marca con `*` la actual. Úsalo siempre que te sientas perdido (el grafo también te lo chiva).',
    objectives: [
      {
        label: 'Listar las ramas con git branch',
        validate: (s) =>
          s.lastCommand?.command === 'branch' &&
          (s.lastCommand.args.length === 0 || s.lastCommand.args[0] === '-a'),
      },
    ],
    hints: ['git branch', 'Verás main, feature/login y feature/dark-mode'],
    curiosity:
      'Hasta 2020 la rama por defecto se llamaba `master`. GitHub la cambió a `main` y Git lo hizo configurable. Puedes elegir el nombre por defecto con `git config --global init.defaultBranch main`.',
  },
  {
    id: 'm2-l7',
    title: 'Merge fast-forward de feature/login',
    description:
      'El login está listo y toca llevarlo a main: eso es un "merge" (fusionar una rama en otra). Se lanza desde la rama que RECIBE los cambios: vuelve a main y ejecuta `git merge feature/login`. Como main no se movió mientras trabajabas, Git solo adelanta su etiqueta hasta tu commit — un "fast-forward", sin commit extra.',
    objectives: [
      { label: 'Estar en main', validate: onBranch('main') },
      {
        label: 'main contiene Login.jsx (merge completado)',
        validate: fileOnBranch('Login.jsx', 'main'),
      },
    ],
    hints: [
      'git switch main',
      'git merge feature/login',
      'Verás "Avance rápido (Fast-forward)"',
    ],
    curiosity:
      'En un fast-forward Git no crea ningún commit nuevo: solo mueve la "etiqueta" de la rama hacia adelante. Si quieres forzar un commit de merge aunque sea fast-forward, usa `git merge --no-ff`.',
  },
  {
    id: 'm2-l8',
    title: 'Merge 3-way y limpiar la rama',
    description:
      'Esta vez main no se queda quieta: simula que otro dev actualiza el CHANGELOG commiteándolo en main. Las dos ramas han divergido, así que Git ya no puede solo adelantar la etiqueta: combinará ambos lados en un "commit de merge" con dos padres. Termina borrando la rama ya integrada con `git branch -d` — las ramas fusionadas no se coleccionan.',
    objectives: [
      {
        label: 'Hacer un commit en main (actualizar CHANGELOG.md)',
        validate: fileOnBranch('CHANGELOG.md', 'main'),
      },
      {
        label: 'Mergear feature/dark-mode a main (merge 3-way)',
        validate: (s) => onBranch('main')(s) && hasMergeInBranch('main')(s),
      },
      {
        label: 'Eliminar la rama feature/dark-mode con -d',
        validate: (s) => !hasBranch('feature/dark-mode')(s),
      },
    ],
    hints: [
      'Primero simula el avance de main:',
      'git switch main && git add CHANGELOG.md && git commit -m "docs: actualizar CHANGELOG"',
      'git merge feature/dark-mode   (ahora es 3-way, crea un merge commit)',
      'git branch -d feature/dark-mode   (limpia la rama ya integrada)',
    ],
    setupFiles: { 'CHANGELOG.md': CHANGELOG_MD },
    curiosity:
      'Un merge 3-way busca el "antepasado común" de las dos ramas y combina los cambios respecto a él. `-d` solo borra ramas ya integradas; `-D` (mayúscula) borra a las bravas, así que úsala con cuidado.',
  },
];
