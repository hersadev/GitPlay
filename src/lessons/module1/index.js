// Módulo 1 — Arrancar TaskFlow (6 lecciones)
// Inicializas un proyecto desde cero: README, estructura base, primer log.

import {
  initialized,
  lastCmd,
  hasFileAnywhere,
  fileOnBranch,
  commitMsgMatches,
} from '../_helpers';
import {
  README_MD,
  PACKAGE_JSON,
  INDEX_HTML,
  APP_JS,
  STYLES_CSS,
  VALIDATION_JS,
} from './fixtures';

export const module1 = [
  {
    id: 'm1-l1',
    title: 'Arrancar TaskFlow',
    description:
      'Vas a construir TaskFlow, una app de gestión de tareas. Lo primero: convertir esta carpeta en un repositorio Git con `git init`.',
    objectives: [
      { label: 'Inicializar el repositorio', validate: initialized },
    ],
    hints: ['Escribe: git init', 'Verás el mensaje "Repositorio Git vacío inicializado"'],
    curiosity:
      'Linus Torvalds escribió la primera versión de Git en solo 10 días, en abril de 2005, después de que BitKeeper retirara la licencia gratuita que usaba el kernel de Linux.',
  },
  {
    id: 'm1-l2',
    title: 'El primer commit: README.md',
    description:
      'Todo proyecto necesita un README explicando qué hace. Añádelo al staging y crea el primer commit del proyecto.',
    objectives: [
      {
        label: 'Añadir README.md al staging area',
        validate: (s) => s.stagingArea.has('README.md') || hasFileAnywhere('README.md')(s),
      },
      {
        label: 'Crear el primer commit con README.md',
        validate: hasFileAnywhere('README.md'),
      },
    ],
    hints: [
      'git add README.md',
      'git commit -m "docs: añadir README inicial"',
      'Convención: los mensajes de docs empiezan con "docs:"',
    ],
    setupFiles: { 'README.md': README_MD },
    curiosity:
      'El primer commit del propio Git fue de Linus Torvalds y su mensaje fue "Initial revision of \'git\', the information manager from hell". Le puso ese nombre medio en broma porque, en inglés británico, "git" significa "tipo desagradable".',
  },
  {
    id: 'm1-l3',
    title: 'Inspeccionar el estado con git status',
    description:
      'Antes de cada commit conviene revisar qué hay en el staging. Añade `package.json`, mira el estado con `git status` y luego commitea.',
    objectives: [
      {
        label: 'Añadir package.json al staging',
        validate: (s) => s.stagingArea.has('package.json') || hasFileAnywhere('package.json')(s),
      },
      {
        label: 'Commitear package.json',
        validate: hasFileAnywhere('package.json'),
      },
      {
        label: 'Consultar el estado con git status (después del commit)',
        validate: lastCmd('status'),
      },
    ],
    hints: [
      'git add package.json',
      'git commit -m "chore: añadir package.json"',
      'git status (debe decir "árbol de trabajo limpio")',
    ],
    setupFiles: { 'package.json': PACKAGE_JSON },
    curiosity:
      'Git tiene tres "zonas": el working directory (lo que ves en disco), el staging area (también llamado "index") y el repositorio. `git status` es básicamente una foto de las diferencias entre las tres.',
  },
  {
    id: 'm1-l4',
    title: 'Varios archivos en un solo commit',
    description:
      'TaskFlow necesita una estructura mínima: `index.html`, `app.js` y `styles.css`. Mételos todos en un único commit con `git add .`.',
    objectives: [
      {
        label: 'Tener index.html commiteado en main',
        validate: fileOnBranch('index.html', 'main'),
      },
      {
        label: 'Tener app.js commiteado en main',
        validate: fileOnBranch('app.js', 'main'),
      },
      {
        label: 'Tener styles.css commiteado en main',
        validate: fileOnBranch('styles.css', 'main'),
      },
    ],
    hints: [
      'Añádelos uno a uno o todos de golpe:',
      'git add index.html app.js styles.css   (o:  git add .)',
      'git commit -m "feat: estructura inicial de la app"',
    ],
    setupFiles: {
      'index.html': INDEX_HTML,
      'app.js': APP_JS,
      'styles.css': STYLES_CSS,
    },
    curiosity:
      'Cada commit en Git se identifica con un hash SHA-1 de 40 caracteres. Normalmente solo usamos los 7 primeros porque, aun acortándolos, las colisiones son prácticamente imposibles en un proyecto real.',
  },
  {
    id: 'm1-l5',
    title: 'Ver el historial con git log',
    description:
      'Ya tienes varios commits. `git log` muestra la línea de tiempo del proyecto: hash, autor, fecha y mensaje de cada uno.',
    objectives: [
      { label: 'Consultar el historial con git log', validate: lastCmd('log') },
    ],
    hints: ['git log', 'Cada commit aparece con su hash corto y su mensaje'],
    curiosity:
      '`git log` abre por defecto un "pager" (como `less`) para poder navegar historiales largos. Pulsa `q` para salir, `/` para buscar y `espacio` para avanzar de página.',
  },
  {
    id: 'm1-l6',
    title: 'Mensajes convencionales: corrige un bug',
    description:
      'La convención más usada (Conventional Commits) prefija el mensaje: `feat:` para nuevas features, `fix:` para bugs, `docs:`, `chore:`, `refactor:`. Crea un commit con un `fix:` simulando que arreglas algo en TaskFlow.',
    objectives: [
      {
        label: 'Crear un commit con prefijo "fix:"',
        validate: commitMsgMatches(/^fix:/),
      },
    ],
    hints: [
      'Por ejemplo, corregir la validación de email:',
      'git add validation.js',
      'git commit -m "fix: validar email vacío en el formulario"',
    ],
    setupFiles: { 'validation.js': VALIDATION_JS },
    curiosity:
      'La convención "Conventional Commits" nació para que un script pueda generar el CHANGELOG y decidir la versión automáticamente: `feat:` sube la minor, `fix:` la patch y un "BREAKING CHANGE:" en el cuerpo sube la major.',
  },
];
