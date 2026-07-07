// Constantes de estilo compartidas por las pestañas de la vista GitHub.
// (En archivo aparte de ui.jsx para que react-refresh solo vea componentes allí.)

export const PR_ROW_ICON = {
  open: { icon: 'pullRequest', color: 'text-[#3fb950]' },
  merged: { icon: 'merge', color: 'text-[#a371f7]' },
  closed: { icon: 'pullRequest', color: 'text-[#f85149]' },
};

export const BTN_GREEN = 'bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3 py-1.5 rounded-md';
export const BTN_SUBTLE = 'bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-md';
