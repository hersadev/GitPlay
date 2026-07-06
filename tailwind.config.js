/** @type {import('tailwindcss').Config} */
// Las escalas de color que usa la app apuntan a variables CSS (tripletes R G B)
// definidas en src/styles/globals.css. Ahí vive cada tema: el clásico (Gruvbox
// cálido) en :root y el retro CRT en [data-theme='retro']. Así el cambio de
// tema no toca ninguna clase de los componentes.
// Convención de la escala `gray`: número alto = más oscuro (fondos),
// número bajo = más claro (texto).
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const scale = (family, nums) =>
  Object.fromEntries(nums.map((n) => [n, v(`${family}-${n}`)]));

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Blanco cálido en lugar del blanco puro (mata el look "neón sobre gris").
        white: v('white'),

        // Superficies y texto.
        gray: scale('gray', [100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950]),

        // Acento principal.
        green: scale('green', [100, 200, 300, 400, 500, 600, 700, 800, 900]),

        yellow: scale('yellow', [200, 300, 400, 700, 900]),
        red: scale('red', [100, 200, 400, 600, 700, 800]),
        purple: scale('purple', [100, 200, 300, 400, 600, 700, 900]),
        blue: scale('blue', [300, 400, 700, 900]),
        orange: scale('orange', [100, 300, 500, 700, 900]),
        sky: scale('sky', [50, 300, 800, 900]),

        // Los pocos usos de emerald/cyan.
        emerald: { 400: v('emerald-400') },
        cyan: { 400: v('cyan-400') },
      },
    },
  },
  plugins: [],
};
