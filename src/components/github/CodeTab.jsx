import { useState } from 'react';
import Octicon from './Octicon';
import { DEFAULT_BRANCH, timeAgo, collectAncestors } from './utils';

// Pestaña Code: los archivos que hay en origin, por rama.
export default function CodeTab({ repo, onOpenFile }) {
  const remoteBranches = [...(repo.remoteBranches?.keys?.() ?? [])];
  const [branch, setBranch] = useState(
    remoteBranches.includes(DEFAULT_BRANCH) ? DEFAULT_BRANCH : remoteBranches[0] ?? ''
  );

  if (remoteBranches.length === 0) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-white font-semibold">Este repositorio está vacío</p>
        <p className="text-sm text-[#8b949e]">
          GitHub solo ve lo que subes con push. Sube tu rama para empezar:
        </p>
        <pre className="bg-[#161b22] border border-[#30363d] rounded-md p-3 text-sm text-gray-200 font-mono">git push origin main</pre>
      </div>
    );
  }

  const tipHash = repo.remoteBranches.get(branch);
  const tip = repo.remoteCommits?.get?.(tipHash);
  const files = tip?.tree instanceof Map ? [...tip.tree.keys()].sort() : [];
  const commitCount = collectAncestors(tipHash, repo.remoteCommits).size;

  // Último commit del remoto que tocó cada archivo (el más reciente).
  function lastCommitFor(file) {
    let best = null;
    for (const h of collectAncestors(tipHash, repo.remoteCommits)) {
      const c = repo.remoteCommits.get(h);
      if (!c?.files?.includes?.(file)) continue;
      if (!best || c.timestamp > best.timestamp) best = c;
    }
    return best;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 bg-[#21262d] border border-[#30363d] rounded-md px-2 py-1">
          <Octicon icon="branch" size={14} className="text-[#8b949e]" />
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="bg-transparent text-sm text-white font-semibold outline-none"
          >
            {remoteBranches.map((b) => (
              <option key={b} value={b} className="bg-[#21262d]">{b}</option>
            ))}
          </select>
        </label>
        <span className="inline-flex items-center gap-1 text-xs text-[#8b949e]">
          <Octicon icon="commit" size={14} />
          {commitCount} commit{commitCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {/* Barra del último commit, como en GitHub */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#161b22] text-xs">
          <span className="w-5 h-5 rounded-full bg-[#30363d] text-gray-300 flex items-center justify-center font-semibold flex-shrink-0">
            {(tip?.author ?? '?')[0].toUpperCase()}
          </span>
          <span className="text-white font-semibold flex-shrink-0">{tip?.author}</span>
          <span className="text-[#8b949e] truncate flex-1">{tip?.message}</span>
          <span className="font-mono text-[#8b949e] flex-shrink-0">{tipHash?.slice(0, 7)}</span>
          <span className="text-[#8b949e] flex-shrink-0">{timeAgo(tip?.timestamp)}</span>
        </div>

        {files.length === 0 ? (
          <p className="p-4 text-sm text-[#8b949e] italic">Sin archivos en esta rama.</p>
        ) : (
          <ul className="divide-y divide-[#21262d]">
            {files.map((f) => {
              const last = lastCommitFor(f);
              return (
                <li key={f} className="flex items-center gap-3 px-3 py-1.5 hover:bg-[#161b22] text-sm">
                  <Octicon icon="file" size={14} className="text-[#8b949e]" />
                  <button
                    onClick={() => onOpenFile?.({ name: f, source: 'commit', hash: (last ?? tip)?.hash })}
                    className="text-gray-200 hover:text-[#58a6ff] hover:underline text-left w-44 truncate flex-shrink-0"
                  >
                    {f}
                  </button>
                  <span className="text-xs text-[#8b949e] truncate flex-1">{last?.message}</span>
                  <span className="text-xs text-[#8b949e] flex-shrink-0">{timeAgo(last?.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-[#8b949e]">
        Esto es lo que hay en <span className="font-mono">origin</span>: tus commits locales sin push no aparecen aquí.
      </p>
    </div>
  );
}
