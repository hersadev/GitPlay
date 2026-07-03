import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ConflictResolver from './ConflictResolver';
import { hasConflictMarkers } from '../../utils/conflicts';

function resolveContent(file, repo) {
  if (!file) return { content: '', label: '', missing: true };
  const { name, source, hash } = file;

  if (source === 'working') {
    const c = repo.workingDirectory?.get?.(name);
    if (c === undefined) return { content: '', label: 'working directory', missing: true };
    return { content: c, label: 'working directory' };
  }
  if (source === 'staged') {
    const c = repo.stagingArea?.get?.(name);
    if (c === undefined) return { content: '', label: 'staging', missing: true };
    return { content: c, label: 'staging' };
  }
  if (source === 'commit' && hash) {
    // El commit puede ser local o solo del remoto (vista GitHub antes del pull).
    const commit = repo.commits?.get?.(hash) ?? repo.remoteCommits?.get?.(hash);
    const c = commit?.tree?.get?.(name);
    if (c === undefined) return { content: '', label: `commit ${hash}`, missing: true };
    return { content: c, label: `commit ${hash}` };
  }
  const tipHash = repo.branches?.get?.(repo.HEAD) ?? (repo.commits?.has?.(repo.HEAD) ? repo.HEAD : null);
  if (tipHash) {
    const tip = repo.commits?.get?.(tipHash);
    const c = tip?.tree?.get?.(name);
    if (c !== undefined) return { content: c, label: `commit ${tipHash}` };
  }
  return { content: '', label: '', missing: true };
}

// Etiquetas amigables para cada lado del conflicto según la operación en curso.
// Ojo: en un rebase, "ours" (HEAD) es la nueva base (el trabajo que ya estaba)
// y "theirs" es TU commit reaplicado — al revés de lo que uno espera.
function conflictSides(repo) {
  if (repo?.rebaseState) {
    return {
      ours: `lo que ya está en ${repo.rebaseState.target}`,
      theirs: 'tu commit reaplicado',
    };
  }
  const from = repo?.mergeState?.fromBranch;
  return {
    ours: `tu rama actual (${repo?.HEAD ?? 'HEAD'})`,
    theirs: from ? `la rama que integras (${from})` : 'los cambios que llegan',
  };
}

function langOf(filename) {
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.md')) return 'md';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.html')) return 'html';
  if (filename.endsWith('.jsx') || filename.endsWith('.tsx')) return 'jsx';
  return 'js';
}

export default function FileViewer({ file, repo, onClose, onSave, onMarkResolved }) {
  const { content, label, missing } = resolveContent(file, repo);
  const lang = langOf(file.name);
  const canEdit = !!onSave; // si el padre nos da onSave, permitimos editar

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  // Modo resolutor: el archivo del working dir trae marcadores de conflicto.
  const conflicted =
    !missing && !editing && canEdit && file.source === 'working' && hasConflictMarkers(content);

  // Si se abre otro archivo, resetear el draft. 'content' queda fuera de las
  // deps a propósito: si cambia mientras se edita no debe pisar el borrador.
  useEffect(() => {
    setDraft(content);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.name, file.source, file.hash]);

  const dirty = editing && draft !== content;

  function save() {
    if (dirty) onSave?.(file.name, draft);
    setEditing(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[55] bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-850 border-b border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs uppercase tracking-wider text-gray-500 flex-shrink-0">{lang}</span>
            <span className="font-mono text-white truncate">{file.name}</span>
            {label && (
              <span className="text-xs text-gray-500 flex-shrink-0">· {label}</span>
            )}
            {dirty && (
              <span className="text-[10px] uppercase text-yellow-400 flex-shrink-0">· modificado</span>
            )}
            {conflicted && (
              <span className="text-[10px] uppercase text-orange-400 flex-shrink-0">· en conflicto</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && !missing && !conflicted && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-2 py-1 rounded"
              >
                Editar
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={() => { setEditing(false); setDraft(content); }}
                  className="text-xs text-gray-400 hover:text-white border border-gray-700 px-2 py-1 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={!dirty}
                  className={`text-xs px-2 py-1 rounded border ${
                    dirty
                      ? 'text-green-300 border-green-800 hover:bg-green-900/40'
                      : 'text-gray-600 border-gray-800 cursor-not-allowed'
                  }`}
                >
                  Guardar
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white text-xl leading-none px-2"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-950 flex flex-col">
          {missing ? (
            <p className="text-gray-500 italic p-6 text-center">
              Sin contenido para mostrar
            </p>
          ) : conflicted ? (
            <ConflictResolver
              content={content}
              sides={conflictSides(repo)}
              onEditManually={() => { setDraft(content); setEditing(true); }}
              onApply={(resolved, markResolved) => {
                onSave?.(file.name, resolved);
                if (markResolved) {
                  onMarkResolved?.(file.name);
                  onClose?.();
                }
              }}
            />
          ) : editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              className="w-full h-[60vh] bg-gray-950 text-gray-100 font-mono text-sm leading-relaxed outline-none resize-none p-4"
            />
          ) : (
            <pre className="text-sm font-mono leading-relaxed">
              <code>
                {content.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="select-none text-gray-600 w-12 text-right pr-3 flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-100 whitespace-pre-wrap break-all flex-1">
                      {line || ' '}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          )}
        </div>

        {canEdit && !editing && !missing && !conflicted && (
          <div className="px-4 py-2 bg-gray-850 border-t border-gray-700 text-[11px] text-gray-500">
            Edita el archivo y haz <code className="text-gray-400">git add</code> + <code className="text-gray-400">git diff</code> para ver tus cambios.
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
