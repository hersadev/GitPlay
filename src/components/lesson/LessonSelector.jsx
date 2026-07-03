import { MODULES, LEVELS } from '../../lessons';

export default function LessonSelector({ currentIndex, maxUnlockedIndex, onSelect, onClose }) {
  let offset = 0;
  const groups = MODULES.map((m) => {
    const items = m.lessons.map((l, i) => ({ ...l, globalIndex: offset + i }));
    offset += m.lessons.length;
    return { name: m.name, level: m.level, items };
  });
  // Módulos agrupados bajo su nivel (básico → medio → avanzado).
  const levels = LEVELS.map((lvl) => ({
    ...lvl,
    groups: groups.filter((g) => g.level === lvl.id),
  })).filter((lvl) => lvl.groups.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">Selecciona una lección</h2>
            <p className="text-xs text-gray-500">
              Las lecciones se desbloquean en orden: cada una construye sobre la anterior.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto p-4 flex flex-col gap-6">
          {levels.map((lvl) => (
            <section key={lvl.id}>
              <header className="flex items-baseline gap-2 mb-1 pb-1.5 border-b border-gray-800">
                <span className="text-sm">{lvl.icon}</span>
                <h3 className="text-sm font-semibold text-white">{lvl.name}</h3>
                <span className="text-xs text-gray-500 truncate">{lvl.tagline}</span>
              </header>
              <div className="flex flex-col gap-4 mt-2">
                {lvl.groups.map((g) => (
                  <section key={g.name}>
                    <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">{g.name}</h3>
                    <ul className="flex flex-col">
                      {g.items.map((l) => {
                        const isCurrent = l.globalIndex === currentIndex;
                        const isPast = l.globalIndex < currentIndex;
                        const isLocked = l.globalIndex > maxUnlockedIndex;
                        const icon = isLocked ? '🔒' : isCurrent ? '→' : isPast ? '✓' : '○';
                        const iconColor = isCurrent
                          ? 'text-yellow-400'
                          : isPast
                          ? 'text-green-400'
                          : 'text-gray-600';
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => !isLocked && onSelect(l.globalIndex)}
                              disabled={isLocked}
                              title={isLocked ? 'Completa las lecciones anteriores para desbloquearla' : undefined}
                              className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${
                                isLocked
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-gray-800'
                              } ${isCurrent ? 'bg-gray-800' : ''}`}
                            >
                              <span className={`text-xs font-mono w-10 flex-shrink-0 ${iconColor}`}>
                                {icon} {String(l.globalIndex + 1).padStart(2, '0')}
                              </span>
                              <span className={isCurrent ? 'text-white font-medium' : 'text-gray-300'}>
                                {l.title}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
