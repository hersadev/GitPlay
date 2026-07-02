import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { exportProgress, importProgress } from '../../utils/persistence';
import { COMMAND_NAMES } from '../../utils/commandInfo';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function Header({
  onReset,
  onOpenLessons,
  onToggleSandbox,
  onOpenBadges,
  onOpenCommands,
  usedCommandsCount = 0,
  onOpenGithub,
  openPRsCount = 0,
  sandboxMode,
  lessonIndex = 0,
  totalLessons = 0,
  earnedCount = 0,
  totalBadges = 0,
}) {
  const fileInputRef = useRef(null);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  function handleConfirmReset() {
    setConfirmResetOpen(false);
    onReset?.();
  }

  function handleExport() {
    const data = exportProgress();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gitplay-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite recargar el mismo archivo otra vez
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch {
        window.alert('No se pudo leer el archivo: no es un JSON válido.');
        return;
      }
      if (!importProgress(data)) {
        window.alert('El archivo no es un guardado válido de GitPlay.');
        return;
      }
      if (window.confirm('Progreso cargado. Se recargará la app para aplicarlo. ¿Continuar?')) {
        window.location.reload();
      }
    };
    reader.readAsText(file);
  }

  const pct = totalLessons > 0 ? Math.round((lessonIndex / totalLessons) * 100) : 0;

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-700 gap-6">
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-white font-bold text-xl">GitPlay</span>
        {!sandboxMode && totalLessons > 0 && (
          <div
            className="flex items-center gap-2 min-w-[180px]"
            title={`${lessonIndex} de ${totalLessons} lecciones completadas`}
          >
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
          onClick={onOpenCommands}
          className="hover:text-blue-300 transition-colors flex items-center gap-1.5"
          title="Tu libreta de comandos: repasa lo que ya has usado y qué hace cada uno"
        >
          <span>📖</span>
          <span className="text-xs">Comandos</span>
          <span className="text-xs text-gray-500 font-mono">
            {usedCommandsCount}/{COMMAND_NAMES.length}
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
          onClick={handleExport}
          className={`transition-colors flex items-center gap-1.5 ${justSaved ? 'text-green-400' : 'hover:text-white'}`}
          title="Descargar tu progreso como archivo"
        >
          <span>{justSaved ? '✓' : '💾'}</span>
          <span className="text-xs">{justSaved ? 'Guardado' : 'Guardar'}</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="hover:text-white transition-colors flex items-center gap-1.5"
          title="Cargar un progreso guardado"
        >
          <span>📂</span>
          <span className="text-xs">Cargar</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={() => setConfirmResetOpen(true)}
          className="text-gray-500 hover:text-red-400 transition-colors text-xs border border-gray-700 hover:border-red-800 px-2 py-1 rounded"
        >
          Reiniciar
        </button>
      </nav>

      <AnimatePresence>
        {confirmResetOpen && (
          <ConfirmDialog
            title="¿Reiniciar todo el progreso?"
            message="Perderás el repositorio, la lección actual, los logros y tu libreta de comandos. Esta acción no se puede deshacer."
            hint="💡 Consejo: puedes descargar una copia antes con el botón 💾 Guardar."
            confirmLabel="Sí, reiniciar"
            cancelLabel="Cancelar"
            danger
            onConfirm={handleConfirmReset}
            onCancel={() => setConfirmResetOpen(false)}
          />
        )}
      </AnimatePresence>
    </header>
  );
}
