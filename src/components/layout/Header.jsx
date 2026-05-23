export default function Header({ onReset, onOpenLessons, onToggleSandbox, sandboxMode }) {
  function handleReset() {
    if (window.confirm('¿Reiniciar todo el progreso? Perderás el repositorio y la lección actual.')) {
      onReset?.();
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700">
      <span className="text-white font-bold text-xl">GitPlay</span>
      <nav className="flex items-center gap-6 text-gray-300 text-sm">
        <button onClick={onOpenLessons} className="hover:text-white transition-colors">
          Lecciones
        </button>
        <button
          onClick={onToggleSandbox}
          className={`transition-colors ${sandboxMode ? 'text-yellow-400 hover:text-yellow-300' : 'hover:text-white'}`}
        >
          {sandboxMode ? 'Volver a lecciones' : 'Sandbox'}
        </button>
        <button
          onClick={handleReset}
          className="text-gray-500 hover:text-red-400 transition-colors text-xs border border-gray-700 hover:border-red-800 px-2 py-1 rounded"
        >
          Reiniciar
        </button>
      </nav>
    </header>
  );
}
