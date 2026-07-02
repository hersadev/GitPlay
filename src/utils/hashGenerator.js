// Hashes estilo Git: 7 caracteres hexadecimales, únicos dentro de la sesión.
// Se registran los hashes ya emitidos (incluidos los cargados de localStorage)
// para que nunca haya colisiones que sobrescriban commits en los Map.

let used = new Set();

export function generateHash() {
  let hash;
  do {
    hash = Math.floor(Math.random() * 0x10000000)
      .toString(16)
      .padStart(7, '0');
  } while (used.has(hash));
  used.add(hash);
  return hash;
}

export function resetHashCounter() {
  used = new Set();
}

// Marca como usados los hashes de un estado cargado (evita colisiones futuras).
export function markHashesUsed(hashes) {
  for (const h of hashes) used.add(h);
}
