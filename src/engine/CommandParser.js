// Comandos de shell que el terminal maneja aparte (App.jsx) o que conviene
// explicar con un mensaje amable en vez de un error seco.
const SHELL_SUPPORTED = new Set(['ls', 'touch', 'clear']);
const SHELL_KNOWN = new Set(['cd', 'mkdir', 'cat', 'pwd', 'rm', 'mv', 'cp', 'echo', 'nano', 'vim', 'code']);

export function parseCommand(input) {
  const trimmed = input.trim();

  // Pistas tipo "git checkout <hash>": los ángulos son un marcador, no se copian.
  if (/<[^>]*>/.test(trimmed)) {
    return {
      valid: false,
      error:
        'Los símbolos <...> de las pistas son un marcador: sustitúyelos por el valor real.\n' +
        'Por ejemplo, si `git log` muestra el commit a1b2c3d, escribe: git checkout a1b2c3d',
    };
  }

  if (trimmed === 'git') {
    return { valid: false, error: 'Uso: git <comando> [<opciones>]' };
  }
  if (!trimmed.startsWith('git ')) {
    const first = trimmed.split(' ')[0];
    if (SHELL_SUPPORTED.has(first)) {
      // Llega aquí si trae opciones no soportadas (p. ej. "ls -la").
      const usage = first === 'touch' ? 'touch <archivo>' : first;
      return { valid: false, error: `Aquí '${first}' funciona sin opciones. Escribe simplemente: ${usage}` };
    }
    if (SHELL_KNOWN.has(first)) {
      return {
        valid: false,
        error: `'${first}' es un comando de terminal, pero este simulador solo practica Git.\nAdemás de git, puedes usar: ls (listar archivos), touch <archivo> (crear archivo) y clear (limpiar pantalla).`,
      };
    }
    return { valid: false, error: `'${first}' no se reconoce. Escribe comandos git (o prueba: ls, touch, clear).` };
  }

  const tokens = tokenize(trimmed.slice(4));
  if (!tokens.length) return { valid: false, error: 'Uso: git <comando> [<opciones>]' };

  return { valid: true, command: tokens[0], args: tokens.slice(1), raw: trimmed };
}

// Divide una línea en comandos encadenados con && (respetando comillas).
export function splitChainedCommands(input) {
  const parts = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      if (ch === quoteChar) inQuote = false;
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === '&' && input[i + 1] === '&') {
      parts.push(current);
      current = '';
      i++; // saltar el segundo &
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
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
