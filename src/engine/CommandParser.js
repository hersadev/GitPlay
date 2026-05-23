export function parseCommand(input) {
  const trimmed = input.trim();

  if (trimmed === 'git') {
    return { valid: false, error: 'Uso: git <comando> [<opciones>]' };
  }
  if (!trimmed.startsWith('git ')) {
    return { valid: false, error: `'${trimmed.split(' ')[0]}' no se reconoce. Escribe comandos git.` };
  }

  const tokens = tokenize(trimmed.slice(4));
  if (!tokens.length) return { valid: false, error: 'Uso: git <comando> [<opciones>]' };

  return { valid: true, command: tokens[0], args: tokens.slice(1), raw: trimmed };
}

function tokenize(str) {
  const tokens = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const ch of str) {
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
    } else if (ch === ' ') {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}
