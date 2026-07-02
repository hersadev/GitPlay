// Archivos para el módulo "Trabajar con GitHub".

export const PROFILE_JSX = `// Página de perfil del usuario.
// Muestra avatar, email y plan actual. Llama a /api/me al montar.

import { api } from './api.js';

export async function renderProfile(root) {
  root.innerHTML = '<p>Cargando perfil…</p>';
  try {
    const me = await api.me();
    root.innerHTML = \`
      <section class="profile">
        <img src="\${me.avatar}" alt="" width="64" height="64" />
        <h2>\${me.name}</h2>
        <p class="email">\${me.email}</p>
        <p class="plan">Plan <strong>\${me.plan}</strong></p>
        <button id="logout">Cerrar sesión</button>
      </section>
    \`;
    document.getElementById('logout').addEventListener('click', () => {
      sessionStorage.removeItem('token');
      location.href = '/login';
    });
  } catch (e) {
    root.innerHTML = '<p class="error">No se pudo cargar el perfil.</p>';
  }
}
`;

export const README_BASE = `# TaskFlow

Aplicación web para gestionar tus tareas diarias.

## Instalación

\`\`\`bash
npm install
npm run dev
\`\`\`

## Equipo

Mantenido por el equipo de TaskFlow.
`;

// Versión modificada por el alumno (en local).
export const README_LOCAL_EDIT = `# TaskFlow

Aplicación web para gestionar tus tareas diarias.
Funciona en navegadores modernos y móvil.

## Instalación

\`\`\`bash
npm install
npm run dev
\`\`\`

## Equipo

Mantenido por el equipo de TaskFlow.
`;

// Versión modificada por "otro dev" en el remoto (causará conflicto al pull).
export const README_TEAMMATE_EDIT = `# TaskFlow

Aplicación web open-source para gestionar tus tareas diarias.

## Instalación

\`\`\`bash
npm install
npm run dev
\`\`\`

## Equipo

Mantenido por el equipo de TaskFlow.
`;

// Cambio que entra por una merge de un compañero en remoto.
export const TEAM_CHANGELOG = `# CHANGELOG

## [Unreleased]

### Añadido
- CI con GitHub Actions (lint + tests en cada PR).
`;

// Otro cambio que el "compañero" añade a main para una lección.
export const FEATURE_FLAGS_JS = `// Sistema mínimo de feature flags leídos de window.__FLAGS__.
// Útil para activar/desactivar features sin redesplegar.

const flags = typeof window !== 'undefined' ? (window.__FLAGS__ ?? {}) : {};

export function isEnabled(name) {
  return !!flags[name];
}
`;

// Archivo para el workflow completo (gh-l7): toggle de tema oscuro.
export const DARK_TOGGLE_JS = `// Toggle de tema oscuro persistido en localStorage.

const KEY = 'taskflow:theme';

export function initTheme() {
  const saved = localStorage.getItem(KEY) ?? 'light';
  document.documentElement.dataset.theme = saved;
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(KEY, next);
}
`;
