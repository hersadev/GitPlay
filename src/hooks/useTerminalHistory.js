import { useState } from 'react';

export function useTerminalHistory() {
  const [lines, setLines] = useState([]);

  function pushCommand(text) {
    setLines((prev) => [...prev, { type: 'command', text }]);
  }

  function pushOutput(text, type = 'success') {
    setLines((prev) => [...prev, { type, text }]);
  }

  function clear() {
    setLines([]);
  }

  return { lines, pushCommand, pushOutput, clear };
}
