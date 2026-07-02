// Archivos del Módulo 3: escenarios de reescritura de historia, stash, tags y cherry-pick.

export const TASKS_JS = `// Módulo de tareas en progreso.
// Aún no está terminado: la persistencia y el filtrado están por hacer.

export class TaskStore {
  constructor() {
    this.items = [];
  }

  add(title) {
    if (!title) return;
    this.items.push({
      id: crypto.randomUUID(),
      title,
      done: false,
      createdAt: Date.now(),
    });
  }

  toggle(id) {
    const t = this.items.find((x) => x.id === id);
    if (t) t.done = !t.done;
  }

  // TODO: persistir en localStorage
  // TODO: filtrar por done/pendiente
}
`;

export const FILTERS_JS = `// Filtros de la lista de tareas: todas / pendientes / completadas.

export function filterTasks(tasks, mode = 'all') {
  switch (mode) {
    case 'pending':
      return tasks.filter((t) => !t.done);
    case 'done':
      return tasks.filter((t) => t.done);
    default:
      return tasks;
  }
}
`;

export const GITIGNORE = `# Dependencias instaladas por npm (se regeneran con npm install)
node_modules

# Carpeta de build (se regenera con npm run build)
dist

# Logs
*.log
`;

export const NODE_MODULES = `// Marcador: en un proyecto real, node_modules es una carpeta
// generada por npm install, con miles de archivos.
// NUNCA debe commitearse: se añade al .gitignore.
//
// En esta lección la usamos como ejemplo de "lo que NO toca subir".
`;

export const EXPERIMENTO_JS = `// Prueba descartable: animar la entrada de las tareas con un fade-in.
// No es producción, era para ver si quedaba bien.

import { TaskStore } from './tasks.js';

const store = new TaskStore();
store.add('Probar animación');

document.querySelectorAll('.task-list li').forEach((li, i) => {
  li.style.animation = \`fade-in 0.3s ease both \${i * 0.05}s\`;
});
`;

export const API_JS = `// Cliente HTTP de TaskFlow. A medias.

const BASE = '/api';

async function request(path, options = {}) {
  const token = sessionStorage.getItem('token');
  const res = await fetch(\`\${BASE}\${path}\`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
      ...options.headers,
    },
  });
  // TODO: manejar 401 (redirigir a login)
  // TODO: manejar 5xx (toast de error)
  return res.json();
}

export const api = {
  listTasks: () => request('/tasks'),
  createTask: (title) => request('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
};
`;

export const AUTH_FIX_JS = `// Fix: el token JWT no estaba siendo validado cuando expiraba.
// Antes de este parche, una sesión caducada seguía haciendo peticiones
// y el backend respondía 401, pero el frontend no redirigía a /login.

import { jwtDecode } from './jwt.js';

export function isTokenValid(token) {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    if (!exp) return false;
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function ensureAuth() {
  const token = sessionStorage.getItem('token');
  if (!isTokenValid(token)) {
    sessionStorage.removeItem('token');
    location.href = '/login';
    return false;
  }
  return true;
}
`;
