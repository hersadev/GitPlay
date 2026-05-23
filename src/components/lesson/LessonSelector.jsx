import { module1 } from '../../lessons/module1';
import { module2 } from '../../lessons/module2';
import { module3 } from '../../lessons/module3';
import { module4 } from '../../lessons/module4';
import { module5 } from '../../lessons/module5';
import { moduleGithub } from '../../lessons/moduleGithub';

const MODULES = [
  { name: 'Módulo 1 — Arrancar TaskFlow', lessons: module1 },
  { name: 'Módulo 2 — Features en ramas', lessons: module2 },
  { name: 'Módulo 3 — Trabajar con GitHub', lessons: moduleGithub },
  { name: 'Módulo 4 — Reescribir historia y releases', lessons: module3 },
  { name: 'Módulo 5 — Trabajo en equipo avanzado', lessons: module4 },
  { name: 'Módulo 6 — Escenarios reales', lessons: module5 },
];

export default function LessonSelector({ currentIndex, onSelect, onClose }) {
  let offset = 0;
  const groups = MODULES.map((m) => {
    const items = m.lessons.map((l, i) => ({ ...l, globalIndex: offset + i }));
    offset += m.lessons.length;
    return { name: m.name, items };
  });

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
          <h2 className="text-white font-semibold">Selecciona una lección</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto p-4 flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.name}>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">{g.name}</h3>
              <ul className="flex flex-col">
                {g.items.map((l) => {
                  const isCurrent = l.globalIndex === currentIndex;
                  const isPast = l.globalIndex < currentIndex;
                  const icon = isCurrent ? '→' : isPast ? '✓' : '○';
                  const iconColor = isCurrent
                    ? 'text-yellow-400'
                    : isPast
                    ? 'text-green-400'
                    : 'text-gray-600';
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => onSelect(l.globalIndex)}
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 hover:bg-gray-800 transition-colors ${
                          isCurrent ? 'bg-gray-800' : ''
                        }`}
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
      </div>
    </div>
  );
}
