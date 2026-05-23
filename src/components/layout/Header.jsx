export default function Header({
  onReset,
  onOpenLessons,
  onToggleSandbox,
  onOpenBadges,
  onOpenGithub,
  openPRsCount = 0,
  sandboxMode,
  lessonIndex = 0,
  totalLessons = 0,
  earnedCount = 0,
  totalBadges = 0,
}) {
  function handleReset() {
    if (window.confirm('¿Reiniciar todo el progreso? Perderás el repositorio, la lección actual y los logros.')) {
      onReset?.();
    }
  }

  const pct = totalLessons > 0 ? Math.round((lessonIndex / totalLessons) * 100) : 0;

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700 gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-white font-bold text-xl">GitPlay</span>
        {!sandboxMode && totalLessons > 0 && (
          <div className="flex items-center gap-2 min-w-[180px]">
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
              {lessonIndex}/{totalLessons}
            </span>
            <div className="relative h-1.5 w-32 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-mono">{pct}%</span>
          </div>
        )}
      </div>

      <nav className="flex items-center gap-5 text-gray-300 text-sm">
        <button onClick={onOpenLessons} className="hover:text-white transition-colors">
          Lecciones
        </button>
        <button
          onClick={onOpenBadges}
          className="hover:text-yellow-300 transition-colors flex items-center gap-1.5"
          title="Logros"
        >
          <span>🏆</span>
          <span className="text-xs text-gray-500 font-mono">
            {earnedCount}/{totalBadges}
          </span>
        </button>
        <button
          onClick={onOpenGithub}
          className="hover:text-purple-300 transition-colors flex items-center gap-1.5"
          title="Vista de GitHub"
        >
          <span>🐙</span>
          <span className="text-xs text-gray-500 font-mono">
            {openPRsCount > 0 ? `${openPRsCount} PR` : 'GitHub'}
          </span>
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
