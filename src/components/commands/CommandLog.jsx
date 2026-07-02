import { motion } from 'framer-motion';
import { COMMAND_INFO, COMMAND_NAMES } from '../../utils/commandInfo';

// Libreta de repaso: muestra cada comando git que el alumno ya ha usado,
// cuántas veces, y una explicación breve. Los que aún no ha tocado aparecen
// atenuados como "por descubrir".
export default function CommandLog({ usedCommands, onClose }) {
  const usedNames = COMMAND_NAMES.filter((c) => usedCommands[c]);
  const pendingNames = COMMAND_NAMES.filter((c) => !usedCommands[c]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div>
            <h2 className="text-white font-semibold">📖 Tu libreta de comandos</h2>
            <p className="text-xs text-gray-500">
              Has usado {usedNames.length} de {COMMAND_NAMES.length} comandos. Repásalos cuando quieras.
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

        <div className="overflow-y-auto p-4 flex flex-col gap-5">
          {usedNames.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aún no has ejecutado ningún comando. Cuando uses uno en el terminal,
              aparecerá aquí con su explicación para que lo repases.
            </p>
          ) : (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Comandos que ya dominas
              </h3>
              <ul className="flex flex-col gap-2">
                {usedNames.map((cmd) => {
                  const info = COMMAND_INFO[cmd];
                  return (
                    <li
                      key={cmd}
                      className="rounded border border-green-900/60 bg-green-900/10 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm text-green-300 font-semibold">
                          git {cmd}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                          usado ×{usedCommands[cmd]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-1">{info.usage}</p>
                      <p className="text-xs text-gray-300 mt-1 leading-snug">{info.desc}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {pendingNames.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Por descubrir
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {pendingNames.map((cmd) => (
                  <li
                    key={cmd}
                    className="text-xs font-mono text-gray-600 border border-gray-800 rounded px-2 py-0.5"
                    title="Aún no lo has usado"
                  >
                    git {cmd}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
