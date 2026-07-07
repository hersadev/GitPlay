import { useState } from 'react';
import Octicon from './Octicon';
import { timeAgo } from './utils';
import { BranchChip, StatePill } from './ui';
import { BTN_GREEN } from './styles';

// Detalle de una Pull Request: conversación, commits, archivos y caja de merge.
export default function PRDetail({ pr, repo, onMerge, onClosePR, onBack, onOpenFile }) {
  const [err, setErr] = useState('');
  const commits = pr.commits.map((h) => repo.remoteCommits?.get?.(h)).filter(Boolean);
  const filesChanged = new Set();
  commits.forEach((c) => c.files?.forEach((f) => filesChanged.add(f)));

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-white font-semibold text-xl leading-snug">
          {pr.title} <span className="text-[#8b949e] font-normal">#{pr.id}</span>
        </h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-[#8b949e]">
          <StatePill state={pr.state} />
          <span>
            <span className="text-gray-300 font-semibold">{pr.author}</span> quiere mergear{' '}
            {commits.length} commit{commits.length !== 1 ? 's' : ''} en{' '}
            <BranchChip name={pr.into} /> desde <BranchChip name={pr.from} />
          </span>
          <span>· abierto {timeAgo(pr.openedAt)}</span>
        </div>
      </div>

      {/* Conversación: la descripción como primer comentario */}
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border-b border-[#30363d] text-xs">
          <span className="w-5 h-5 rounded-full bg-[#30363d] text-gray-300 flex items-center justify-center font-semibold">
            {pr.author[0].toUpperCase()}
          </span>
          <span className="text-white font-semibold">{pr.author}</span>
          <span className="text-[#8b949e]">comentó {timeAgo(pr.openedAt)}</span>
        </div>
        <div className="px-3 py-2.5 text-sm text-gray-300 whitespace-pre-wrap">
          {pr.body || <span className="italic text-[#8b949e]">Sin descripción.</span>}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-[#8b949e] mb-2">
          Commits ({commits.length})
        </p>
        <ul className="space-y-1">
          {commits.map((c) => (
            <li key={c.hash} className="flex items-center gap-2 text-sm">
              <Octicon icon="commit" size={14} className="text-[#8b949e]" />
              <span className="text-gray-200 truncate flex-1">{c.message}</span>
              <span className="font-mono text-xs text-[#58a6ff]">{c.hash}</span>
            </li>
          ))}
        </ul>
      </div>

      {filesChanged.size > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-[#8b949e] mb-2">
            Archivos cambiados ({filesChanged.size})
          </p>
          <ul className="space-y-0.5">
            {[...filesChanged].sort().map((f) => {
              const lastCommit = [...commits].reverse().find((c) => c.files?.includes(f));
              return (
                <li key={f} className="flex items-center gap-2 text-sm font-mono">
                  <Octicon icon="file" size={14} className="text-[#8b949e]" />
                  <button
                    onClick={() => lastCommit && onOpenFile?.({ name: f, source: 'commit', hash: lastCommit.hash })}
                    className="text-[#58a6ff] hover:underline text-left"
                  >
                    {f}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Caja de merge, como la de GitHub */}
      {pr.state === 'open' && (
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="flex items-start gap-2.5 px-3 py-3">
            <span className="w-7 h-7 rounded-full bg-[#238636] flex items-center justify-center text-white flex-shrink-0">
              <Octicon icon="check" size={14} />
            </span>
            <div>
              <p className="text-sm text-white font-semibold">Sin conflictos con la rama base</p>
              <p className="text-xs text-[#8b949e]">El merge puede hacerse automáticamente.</p>
            </div>
          </div>
          <div className="px-3 py-2.5 bg-[#161b22] border-t border-[#30363d] flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const res = onMerge(pr.id);
                if (res && !res.ok) setErr(res.output);
              }}
              className={BTN_GREEN}
            >
              Merge pull request
            </button>
            <button
              onClick={() => {
                const res = onClosePR?.(pr.id);
                if (res && !res.ok) setErr(res.output);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#30363d] text-[#f85149] hover:bg-[#da363326]"
            >
              Cerrar pull request
            </button>
            {err && <span className="text-xs text-[#f85149]">{err}</span>}
          </div>
        </div>
      )}

      {pr.state === 'merged' && (
        <div className="flex items-start gap-2.5 border border-[#8957e5] bg-[#8957e51a] rounded-md px-3 py-3">
          <Octicon icon="merge" size={16} className="text-[#a371f7] mt-0.5" />
          <div>
            <p className="text-sm text-white font-semibold">
              Pull request mergeada {timeAgo(pr.mergedAt)}
            </p>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Los cambios ya están en <BranchChip name={pr.into} /> del remoto. Actualiza tu local:{' '}
              <code className="text-gray-300">git switch {pr.into} && git pull</code>
            </p>
          </div>
        </div>
      )}

      {pr.state === 'closed' && (
        <div className="flex items-start gap-2.5 border border-[#30363d] bg-[#161b22] rounded-md px-3 py-3">
          <Octicon icon="pullRequest" size={16} className="text-[#f85149] mt-0.5" />
          <p className="text-sm text-[#8b949e]">Cerrada sin merge {timeAgo(pr.closedAt)}.</p>
        </div>
      )}

      <button onClick={onBack} className="text-xs text-[#58a6ff] hover:underline">
        ← Volver a la lista
      </button>
    </div>
  );
}
