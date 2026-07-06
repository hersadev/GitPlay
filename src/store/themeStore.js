import { create } from 'zustand';
import { loadTheme, saveTheme } from '../utils/persistence';

// El tema vive como atributo en <html>: [data-theme='retro'] redefine las
// variables de color de globals.css y activa los efectos CRT. Los componentes
// que pintan colores desde JS (GraphView) se suscriben a este store.
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

const initialTheme = loadTheme();
// Se aplica al importar el módulo, antes del primer render: sin parpadeo.
applyTheme(initialTheme);

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === 'retro' ? 'classic' : 'retro';
      applyTheme(theme);
      saveTheme(theme);
      return { theme };
    }),
}));
