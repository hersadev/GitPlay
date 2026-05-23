// Contenido realista de los archivos que el alumno "encuentra" en el
// working directory durante el Módulo 1. Imitan el arranque de TaskFlow,
// una app de gestión de tareas.

export const README_MD = `# TaskFlow

Aplicación web para gestionar tus tareas diarias.
Permite crear listas, marcar tareas como hechas y filtrar por estado.

## Tecnología

- HTML + CSS vanilla
- JavaScript modular (ES2020)
- Sin frameworks (de momento)

## Cómo arrancar

\`\`\`bash
npm install
npm run dev
\`\`\`

## Roadmap

- [ ] Login con email
- [ ] Modo oscuro
- [ ] Sincronización con backend
`;

export const PACKAGE_JSON = `{
  "name": "taskflow",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
`;

export const INDEX_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskFlow</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header>
      <h1>TaskFlow</h1>
    </header>
    <main id="app"></main>
    <script type="module" src="/app.js"></script>
  </body>
</html>
`;

export const APP_JS = `// TaskFlow — punto de entrada de la app.
// Por ahora solo dibuja una lista vacía y un botón "Añadir tarea".

const root = document.getElementById('app');

function render(tasks) {
  root.innerHTML = \`
    <ul class="task-list">
      \${tasks.map((t) => \`<li>\${t.title}</li>\`).join('')}
    </ul>
    <button id="add">+ Añadir tarea</button>
  \`;
  document.getElementById('add').addEventListener('click', () => {
    const title = prompt('Nueva tarea');
    if (title) render([...tasks, { title }]);
  });
}

render([]);
`;

export const STYLES_CSS = `:root {
  --bg: #0f172a;
  --fg: #e2e8f0;
  --accent: #4ade80;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #1e293b;
}

.task-list {
  list-style: none;
  padding: 1rem 1.5rem;
}

.task-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #1e293b;
}

button {
  margin: 0.5rem 1.5rem;
  background: var(--accent);
  border: 0;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
`;

export const VALIDATION_JS = `// Validaciones de formularios para TaskFlow.

export function validateEmail(email) {
  if (!email) return 'El email es obligatorio';
  if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
    return 'Formato de email no válido';
  }
  return null;
}

export function validateTaskTitle(title) {
  if (!title || !title.trim()) return 'La tarea no puede estar vacía';
  if (title.length > 120) return 'Máximo 120 caracteres';
  return null;
}
`;
