// El SVG pinta con atributos (no clases Tailwind), así que los colores del
// grafo se eligen aquí según el tema. Todos en hex de 6 dígitos: las etiquetas
// les añaden alpha con sufijos tipo `${color}40`.
export const GRAPH_PALETTES = {
  classic: {
    branches: [
      '#b8bb26', // verde oliva — main
      '#83a598', // azul
      '#d3869b', // púrpura
      '#fe8019', // naranja
      '#8ec07c', // aqua
      '#fabd2f', // amarillo
    ],
    orphan: '#928374',   // commits sin rama y textos secundarios
    tag: '#d3869b',
    head: '#fabd2f',     // halo/anillo/etiqueta de HEAD
    headText: '#1d2021', // texto sobre fondos `head` y de etiqueta activa
    nodeText: 'white',   // hash dentro del nodo
    remoteFill: '#3c383620',
    dotGrid: '#1f2937',
    msg: '#928374',
    msgSelected: '#bdae93',
    // Mini-grafo del estado vacío.
    ghostLine: '#3f3f46',
    ghostFill: '#1f2937',
    ghostStroke: '#4b5563',
    ghostText: '#6b7280',
  },
  retro: {
    branches: [
      '#39ff39', // verde fósforo — main
      '#3cd6d6', // cian
      '#dd6fdd', // magenta
      '#ff8c1a', // naranja
      '#2ee686', // verde-cian
      '#ffb000', // ámbar
    ],
    orphan: '#4e8a4e',
    tag: '#dd6fdd',
    head: '#ffb000',
    headText: '#000000',
    nodeText: '#000000', // vídeo inverso: negro sobre fósforo
    remoteFill: '#15281540',
    dotGrid: '#122412',
    msg: '#4e8a4e',
    msgSelected: '#85c785',
    ghostLine: '#234023',
    ghostFill: '#0e1e0e',
    ghostStroke: '#3b6b3b',
    ghostText: '#4e8a4e',
  },
};

// Radio de los nodos del grafo; lo comparten nodos, aristas, etiquetas y cámara.
export const NODE_R = 18;
