import { useState } from 'react';
import { motion } from 'framer-motion';

function StateBadge({ state }) {
  const styles = {
    open: 'bg-green-700/40 border-green-600 text-green-200',
    merged: 'bg-purple-700/40 border-purple-600 text-purple-200',
    closed: 'bg-red-700/40 border-red-600 text-red-200',
  }[state] ?? 'bg-gray-700/40 border-gray-600 text-gray-300';
  const label = { open: 'Open', merged: 'Merged', closed: 'Closed' }[state] ?? state;
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function NewPRForm({ repo, onSubmit, onCancel }) {
  const localBranches = [...(repo.branches?.keys?.() ?? [])];
  const remoteBranches = [...(repo.remoteBranches?.keys?.() ?? [])];
  const fromOptions = localBranches.filter((b) => remoteBranches.includes(b));
  const intoOptions = remoteBranches.filter((b) => b !== fromOptions[0]);

  const [from, setFrom] = useState(fromOptions[0] ?? '');
  const [into, setInto] = useState(intoOptions[0] ?? 'main');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');

  function submit() {
    if (!from || !into) return setErr('Selecciona rama origen y destino.');
    if (from === into) return setErr('Origen y destino no pueden ser iguales.');
    const res = onSubmit({ from, into, title, body });
    if (res && !res.ok) setErr(res.output);
  }

  if (fromOptions.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400 text-center">
        Necesitas pushear al menos una rama a origin antes de abrir un PR.<br />
        <code className="text-gray-300">git push origin &lt;rama&gt;</code>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-white font-semibold">Nueva Pull Request</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-400">
          De rama
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full mt-1 bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1.5"
          >
            {fromOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-400">
          A rama
          <select
            value={into}
            onChange={(e) => setInto(e.target.value)}
            className="w-full mt-1 bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1.5"
          >
            {remoteBranches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-xs text-gray-400 block">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${from} → ${into}`}
          className="w-full mt-1 bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1.5"
        />
      </label>
      <label className="text-xs text-gray-400 block">
        Descripción (opcional)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full mt-1 bg-gray-800 border border-gray-700 text-white text-sm rounded px-2 py-1.5 resize-none"
        />
      </label>
      {err && <p className="text-xs text-red-400 whitespace-pre-wrap">{err}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded"
        >
          Abrir Pull Request
        </button>
      </div>
    </div>
  );
}

function PRDetail({ pr, repo, onMerge, onClose, onOpenFile }) {
  const commits = pr.commits.map((h) => repo.remoteCommits?.get?.(h)).filter(Boolean);
  const date = new Date(pr.openedAt).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const filesChanged = new Set();
  commits.forEach((c) => c.files?.forEach((f) => filesChanged.add(f)));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StateBadge state={pr.state} />
            <span className="text-gray-500 text-xs">#{pr.id}</span>
          </div>
          <h3 className="text-white font-semibold text-lg mt-1 leading-snug">{pr.title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-gray-400">{pr.author}</span> quiere mergear{' '}
            <code className="text-green-300">{pr.from}</code> en{' '}
            <code className="text-blue-300">{pr.into}</code> · {date}
          </p>
        </div>
        {pr.state === 'open' && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onMerge(pr.id)}
              className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded font-semibold"
            >
              Merge PR
            </button>
          </div>
        )}
      </div>

      {pr.body && (
        <div className="bg-gray-850 border border-gray-700 rounded p-3 text-sm text-gray-300 whitespace-pre-wrap">
          {pr.body}
        </div>
      )}

      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          {commits.length} commit{commits.length !== 1 ? 's' : ''}
        </p>
        <ul className="space-y-1">
          {commits.map((c) => (
            <li key={c.hash} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs text-gray-500">{c.hash}</span>
              <span className="text-gray-200 truncate">{c.message}</span>
            </li>
          ))}
        </ul>
      </div>

      {filesChanged.size > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            {filesChanged.size} archivo{filesChanged.size !== 1 ? 's' : ''} cambiado{filesChanged.size !== 1 ? 's' : ''}
          </p>
          <ul className="space-y-0.5">
            {[...filesChanged].map((f) => {
              // Buscar el último commit del PR que toque ese archivo, para mostrar su contenido
              const lastCommit = [...commits].reverse().find((c) => c.files?.includes(f));
              return (
                <li key={f} className="text-sm font-mono">
                  <button
                    onClick={() => lastCommit && onOpenFile?.({ name: f, source: 'commit', hash: lastCommit.hash })}
                    className="text-green-300 hover:text-green-200 hover:underline text-left"
                  >
                    + {f}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="pt-2 border-t border-gray-700">
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-white"
        >
          ← Volver a la lista
        </button>
      </div>
    </div>
  );
}

export default function GitHubView({ repo, onClose, onOpenPR, onMergePR, onOpenFile }) {
  const [tab, setTab] = useState('pulls');
  const [selectedPR, setSelectedPR] = useState(null);
  const [newPROpen, setNewPROpen] = useState(false);

  const pulls = repo.pullRequests ?? [];
  const branches = [...(repo.remoteBranches?.entries?.() ?? [])];

  function handleSubmitNewPR({ from, into, title, body }) {
    const res = onOpenPR({ from, into, title, body });
    if (res.ok) {
      setNewPROpen(false);
    }
    return res;
  }

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
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🐙</span>
              <h2 className="text-white font-semibold">github.com/tu-equipo/taskflow</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <nav className="flex gap-4 mt-2 text-sm">
            <button
              onClick={() => setTab('pulls')}
              className={`pb-1 border-b-2 transition-colors ${
                tab === 'pulls'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Pull Requests ({pulls.filter((p) => p.state === 'open').length})
            </button>
            <button
              onClick={() => setTab('branches')}
              className={`pb-1 border-b-2 transition-colors ${
                tab === 'branches'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Branches ({branches.length})
            </button>
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto">
          {tab === 'pulls' && (
            <>
              {selectedPR ? (
                <PRDetail
                  pr={pulls.find((p) => p.id === selectedPR)}
                  repo={repo}
                  onMerge={(id) => {
                    onMergePR(id);
                  }}
                  onClose={() => setSelectedPR(null)}
                  onOpenFile={onOpenFile}
                />
              ) : newPROpen ? (
                <NewPRForm
                  repo={repo}
                  onSubmit={handleSubmitNewPR}
                  onCancel={() => setNewPROpen(false)}
                />
              ) : (
                <>
                  <div className="flex justify-end p-3 border-b border-gray-800">
                    <button
                      onClick={() => setNewPROpen(true)}
                      className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded"
                    >
                      + New Pull Request
                    </button>
                  </div>
                  {pulls.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No hay Pull Requests todavía. Hace <code>git push</code> y abre uno.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-800">
                      {pulls.map((pr) => (
                        <li key={pr.id}>
                          <button
                            onClick={() => setSelectedPR(pr.id)}
                            className="w-full text-left p-3 hover:bg-gray-850 flex items-start gap-3"
                          >
                            <StateBadge state={pr.state} />
                            <div className="min-w-0 flex-1">
                              <p className="text-white text-sm font-medium leading-snug truncate">{pr.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                #{pr.id} · <code className="text-green-400">{pr.from}</code> → <code className="text-blue-400">{pr.into}</code>
                                {pr.commits.length > 0 && ` · ${pr.commits.length} commit${pr.commits.length !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'branches' && (
            <ul className="divide-y divide-gray-800">
              {branches.length === 0 ? (
                <li className="p-6 text-center text-sm text-gray-500">
                  No hay ramas en el remoto todavía.
                </li>
              ) : (
                branches.map(([name, hash]) => {
                  const localHash = repo.branches?.get?.(name);
                  const synced = localHash === hash;
                  return (
                    <li key={name} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-mono text-white text-sm">{name}</p>
                        <p className="text-xs text-gray-500">{hash?.slice(0, 7) ?? '(vacía)'}</p>
                      </div>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${synced ? 'border-green-700 text-green-300' : 'border-yellow-700 text-yellow-300'}`}>
                        {synced ? 'sincronizada' : 'desincronizada'}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
