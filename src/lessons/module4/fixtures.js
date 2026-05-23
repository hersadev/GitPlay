// Archivos del Módulo 4: HEAD desacoplado, reflog, rebase y GitFlow.

export const DASHBOARD_JSX = `// Dashboard inicial de TaskFlow.
// Muestra tareas pendientes, completadas esta semana y racha de días.

import { api } from './api.js';

export async function renderDashboard(root) {
  root.innerHTML = '<p>Cargando dashboard…</p>';
  const tasks = await api.listTasks();

  const pending = tasks.filter((t) => !t.done);
  const doneThisWeek = tasks.filter((t) =>
    t.done && Date.now() - t.completedAt < 7 * 24 * 60 * 60 * 1000
  );

  root.innerHTML = \`
    <section class="dashboard">
      <article>
        <h2>Pendientes</h2>
        <strong>\${pending.length}</strong>
      </article>
      <article>
        <h2>Completadas esta semana</h2>
        <strong>\${doneThisWeek.length}</strong>
      </article>
    </section>
  \`;
}
`;

export const METRICS_JS = `// Métricas mínimas: cuenta pageviews y eventos personalizados.
// En cuanto tengamos backend, se enviarán a /api/metrics.

const buffer = [];

export function track(event, data = {}) {
  buffer.push({ event, data, t: Date.now() });
  if (buffer.length >= 20) flush();
}

function flush() {
  if (!buffer.length) return;
  navigator.sendBeacon?.('/api/metrics', JSON.stringify(buffer.splice(0)));
}

window.addEventListener('beforeunload', flush);
setInterval(flush, 30_000);
`;

export const NOTIFICATIONS_JS = `// Notificaciones in-app.
// Versión simple: panel emergente abajo a la derecha.

const queue = [];
let mounted = false;

export function notify(message, { type = 'info', timeout = 3000 } = {}) {
  queue.push({ message, type, timeout });
  if (!mounted) mount();
  drain();
}

function mount() {
  const host = document.createElement('div');
  host.id = 'notifications';
  host.className = 'notifications-host';
  document.body.appendChild(host);
  mounted = true;
}

function drain() {
  const host = document.getElementById('notifications');
  while (queue.length) {
    const { message, type, timeout } = queue.shift();
    const el = document.createElement('div');
    el.className = \`toast toast--\${type}\`;
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), timeout);
  }
}
`;
