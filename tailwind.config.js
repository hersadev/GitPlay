/** @type {import('tailwindcss').Config} */
// Paleta Gruvbox (cálida / retro-terminal). Remapeamos las escalas de Tailwind
// que usa la app para no tener que tocar las clases de cada componente.
// Convención de la escala `gray`: número alto = más oscuro (fondos),
// número bajo = más claro (texto).
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Blanco cálido en lugar del blanco puro (mata el look "neón sobre gris").
        white: '#fbf1c7',

        // Superficies y texto (marrón-carbón → crema).
        gray: {
          100: '#ebdbb2',
          200: '#d5c4a1',
          300: '#bdae93',
          400: '#a89984',
          500: '#928374',
          600: '#7c6f64',
          700: '#504945',
          750: '#453f3b',
          800: '#3c3836',
          850: '#32302f',
          900: '#282828',
          950: '#1d2021',
        },

        // Acento principal: verde oliva gruvbox.
        green: {
          100: '#eef1c0',
          200: '#dde08f',
          300: '#cacb57',
          400: '#b8bb26',
          500: '#a6a71f',
          600: '#98971a',
          700: '#727010',
          800: '#5a580c',
          900: '#454408',
        },

        yellow: {
          200: '#fbe5a0',
          300: '#fcd561',
          400: '#fabd2f',
          700: '#b57614',
          900: '#7a5210',
        },

        red: {
          100: '#fbd7d0',
          200: '#f6b0a4',
          400: '#fb4934',
          600: '#cc241d',
          700: '#9d0006',
          800: '#79040b',
        },

        purple: {
          100: '#f3dde6',
          200: '#e8bccb',
          300: '#dea1b3',
          400: '#d3869b',
          600: '#b16286',
          700: '#8f4f6d',
          900: '#57324a',
        },

        blue: {
          300: '#a6c0b4',
          400: '#83a598',
          700: '#356e6f',
          900: '#213a3c',
        },

        orange: {
          100: '#fde1c6',
          300: '#fdb877',
          500: '#fe8019',
          700: '#d65d0e',
          900: '#8a3d0b',
        },

        // Aqua gruvbox para los pocos usos de emerald/cyan.
        emerald: { 400: '#8ec07c' },
        cyan: { 400: '#8ec07c' },
      },
    },
  },
  plugins: [],
};
