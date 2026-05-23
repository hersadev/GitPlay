let counter = 0;

export function generateHash() {
  counter++;
  return counter.toString(16).padStart(2, '0').slice(-2);
}

export function resetHashCounter() {
  counter = 0;
}

export function setHashCounter(n) {
  counter = n;
}
