// Formas alternativas correctas de un mismo comando. Si el ejercicio pide una
// y el usuario resuelve con la otra, el resultado vale igual (las lecciones
// validan por estado del grafo) pero se le avisa en el terminal de que la
// lección lo pedía de otra manera.
//
// Cada regla: `used` reconoce el comando tecleado; `usedNeedle`/`askedNeedle`
// son los textos que delatan qué forma menciona la lección; `asked` construye
// el comando equivalente pedido a partir del match; `requiresOutput` filtra
// por la salida del comando (p. ej. distinguir un cambio de rama de un
// checkout a hash con HEAD desacoplado, que no tiene equivalente en switch).
const RULES = [
  {
    used: /^git\s+checkout\s+-b\s+(\S+)$/,
    usedNeedle: 'checkout -b',
    askedNeedle: 'switch -c',
    asked: ([, name]) => `git switch -c ${name}`,
  },
  {
    used: /^git\s+switch\s+-c\s+(\S+)$/,
    usedNeedle: 'switch -c',
    askedNeedle: 'checkout -b',
    asked: ([, name]) => `git checkout -b ${name}`,
  },
  {
    used: /^git\s+checkout\s+(\S+)$/,
    usedNeedle: 'checkout',
    askedNeedle: 'switch',
    asked: ([, name]) => `git switch ${name}`,
    requiresOutput: /^Cambiado a rama/,
  },
  {
    used: /^git\s+branch\s+-D\s+(\S+)$/,
    usedNeedle: 'branch -D',
    askedNeedle: 'branch -d',
    asked: ([, name]) => `git branch -d ${name}`,
  },
  {
    used: /^git\s+switch\s+(?:--detach|-d)\s+(\S+)$/,
    usedNeedle: 'switch --detach',
    askedNeedle: 'checkout',
    asked: ([, target]) => `git checkout ${target}`,
    // Solo si el destino era un commit: si se desacopló desde una rama
    // (git switch --detach main), checkout con ese nombre NO haría lo mismo.
    requiresOutput: ([, target]) => new RegExp(`^HEAD desacoplado en ${target}`),
  },
  {
    used: /^git\s+tag\s+-a\s+(\S+)/,
    usedNeedle: 'tag -a',
    askedNeedle: ['git tag', 'tag v'],
    asked: ([, name]) => `git tag ${name}`,
  },
];

const mentions = (text, needles) =>
  (Array.isArray(needles) ? needles : [needles]).some((n) => text.includes(n));

// Qué forma pide la lección: decide el primer nivel de texto que mencione
// alguna de las dos, por orden de autoridad (objetivos > título > descripción).
// Si ese nivel menciona la forma usada, la lección la contempla y no se avisa.
// Las pistas NO cuentan: son recetas paso a paso y citan comandos auxiliares
// de pasada (un "git switch main" previo no significa que la lección enseñe
// switch). Las curiosidades tampoco, son anécdota y no enunciado.
export function equivalentCommandWarning(command, result, lesson) {
  if (!lesson) return null;
  for (const rule of RULES) {
    const m = command.match(rule.used);
    if (!m) continue;
    const outputGate = typeof rule.requiresOutput === 'function' ? rule.requiresOutput(m) : rule.requiresOutput;
    if (outputGate && !outputGate.test(result.output ?? '')) continue;
    const tiers = [
      (lesson.objectives ?? []).map((o) => o.label).join('\n'),
      lesson.title ?? '',
      lesson.description ?? '',
    ];
    for (const tier of tiers) {
      const mentionsUsed = mentions(tier, rule.usedNeedle);
      const mentionsAsked = mentions(tier, rule.askedNeedle);
      if (!mentionsUsed && !mentionsAsked) continue;
      if (mentionsAsked && !mentionsUsed) {
        return `Aviso: el resultado es el mismo y se da por bueno, pero la lección lo pedía de otra manera: ${rule.asked(m)}`;
      }
      break;
    }
  }
  return null;
}
