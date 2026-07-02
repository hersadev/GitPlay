// Parseo y matching de reglas de .gitignore (versión simplificada del simulador):
// una regla por línea, se ignoran comentarios (#) y líneas vacías, se admite
// nombre exacto, barra final de carpeta (node_modules/) y comodín * (*.log).

export function parseIgnoreRules(content) {
  if (!content) return [];
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.replace(/\/+$/, ''));
}

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function matchesIgnore(name, rules) {
  return rules.some((rule) => {
    if (!rule.includes('*')) return rule === name;
    const rx = new RegExp('^' + rule.split('*').map(escapeRx).join('.*') + '$');
    return rx.test(name);
  });
}
