// Archivos del Módulo 5: escenarios reales (incidentes, hotfixes, releases).

export const EXPERIMENTAL_JS = `// Experimento: probar drag-and-drop entre listas.
// Quedó a medias y se commiteó por error en main.

import { TaskStore } from './tasks.js';

const store = new TaskStore();

document.querySelectorAll('.task-list li').forEach((li) => {
  li.draggable = true;
  li.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', li.dataset.id);
  });
});
`;

export const CSRF_FIX_JS = `// Fix de seguridad: el endpoint /api/login no validaba el token CSRF
// que enviábamos en la cookie "_csrf". Un atacante podía forzar login
// con un formulario malicioso desde otro origen.
//
// Solución: leer el header X-CSRF-Token y compararlo en el backend,
// pero por el lado del cliente nos aseguramos de enviarlo siempre.

const CSRF_HEADER = 'X-CSRF-Token';

function getCsrfFromCookie() {
  const match = document.cookie.match(/(?:^|; )_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function withCsrf(init = {}) {
  const token = getCsrfFromCookie();
  if (!token) return init;
  return {
    ...init,
    credentials: 'include',
    headers: {
      ...init.headers,
      [CSRF_HEADER]: token,
    },
  };
}
`;

export const PAYMENTS_JSX = `// Integración con Stripe Checkout para upgrade a plan Pro.

import { loadStripe } from '@stripe/stripe-js';
import { api } from './api.js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PK;

export async function startCheckout(plan = 'pro_monthly') {
  const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
  const { sessionId } = await api.createCheckoutSession(plan);
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) {
    console.error('Stripe redirect failed', error);
    throw error;
  }
}

export function PaymentsButton({ onError }) {
  const btn = document.createElement('button');
  btn.textContent = 'Pasar a Pro';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await startCheckout();
    } catch (e) {
      onError?.(e);
    } finally {
      btn.disabled = false;
    }
  });
  return btn;
}
`;

// "Otro dev" cambió api.js en main mientras tú trabajabas en payments.
export const API_REFACTORED_JS = `// Cliente HTTP de TaskFlow. Refactor: timeouts y retry automático.

const BASE = '/api';
const DEFAULT_TIMEOUT = 8000;

async function request(path, options = {}) {
  const token = sessionStorage.getItem('token');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT);

  try {
    const res = await fetch(\`\${BASE}\${path}\`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
        ...options.headers,
      },
    });
    if (res.status === 401) {
      sessionStorage.removeItem('token');
      location.href = '/login';
      return null;
    }
    return res.json();
  } finally {
    clearTimeout(t);
  }
}

export const api = {
  listTasks: () => request('/tasks'),
  createTask: (title) => request('/tasks', { method: 'POST', body: JSON.stringify({ title }) }),
  createCheckoutSession: (plan) => request('/billing/checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
};
`;
