import { useState } from 'react';

export default function HintSystem({ hints = [] }) {
  const [revealed, setRevealed] = useState(0);

  if (!hints.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Pistas</h3>
      <ul className="space-y-1">
        {hints.slice(0, revealed).map((hint, i) => (
          <li key={i} className="text-sm text-yellow-300 bg-yellow-900/20 rounded px-2 py-1">
            {hint}
          </li>
        ))}
      </ul>
      {revealed < hints.length && (
        <button
          onClick={() => setRevealed((r) => r + 1)}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Mostrar pista
        </button>
      )}
    </div>
  );
}
