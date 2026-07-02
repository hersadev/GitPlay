// Archivos que aparecen al trabajar en ramas de features de TaskFlow.

export const LOGIN_JSX = `// Formulario de login para TaskFlow.
// Esta versión usa fetch contra /api/auth/login y guarda el token en sessionStorage.

import { validateEmail } from './validation.js';

export function LoginForm({ onSuccess }) {
  const form = document.createElement('form');
  form.innerHTML = \`
    <label>
      Email
      <input type="email" name="email" autocomplete="username" required />
    </label>
    <label>
      Contraseña
      <input type="password" name="password" autocomplete="current-password" required />
    </label>
    <button type="submit">Entrar</button>
    <p class="error" hidden></p>
  \`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const emailError = validateEmail(data.email);
    if (emailError) return showError(emailError);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) return showError('Credenciales incorrectas');
    const { token } = await res.json();
    sessionStorage.setItem('token', token);
    onSuccess?.();
  });

  function showError(msg) {
    const p = form.querySelector('.error');
    p.textContent = msg;
    p.hidden = false;
  }

  return form;
}
`;

export const DARK_MODE_JS = `// Alternador de modo oscuro.
// Persiste la preferencia en localStorage para que sobreviva al refresco.

const KEY = 'taskflow:theme';

export function initDarkMode() {
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const initial = saved ?? (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  return {
    toggle() {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(KEY, next);
    },
  };
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
`;

export const SETTINGS_JS = `// Pantalla de ajustes de TaskFlow.
// Agrupa las preferencias del usuario (idioma, notificaciones, tema).

const KEY = 'taskflow:settings';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? defaults();
  } catch {
    return defaults();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

function defaults() {
  return { language: 'es', notifications: true, theme: 'system' };
}
`;

export const CHANGELOG_MD = `# CHANGELOG

Todos los cambios relevantes de TaskFlow se documentan aquí.
Sigue el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

### Añadido
- Formulario de login conectado a /api/auth/login.
- Alternador de modo oscuro con persistencia en localStorage.

### Corregido
- Validación de email vacío en el formulario.
`;
