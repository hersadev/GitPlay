import Octicon from './Octicon';
import { DEFAULT_BRANCH, timeAgo, aheadBehind } from './utils';

// Pestaña Branches: ramas del remoto con ahead/behind respecto a la rama por defecto.
export default function BranchesTab({ repo }) {
  const branches = [...(repo.remoteBranches?.entries?.() ?? [])];

  return (
    <div className="p-4">
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {branches.length === 0 ? (
          <p className="p-6 text-center text-sm text-[#8b949e]">
            No hay ramas en el remoto todavía. Sube la primera con{' '}
            <code className="text-gray-300">git push origin main</code>.
          </p>
        ) : (
          <ul className="divide-y divide-[#21262d]">
            {branches.map(([name, hash]) => {
              const tip = repo.remoteCommits?.get?.(hash);
              const isDefault = name === DEFAULT_BRANCH;
              const mainTip = repo.remoteBranches?.get?.(DEFAULT_BRANCH);
              const ab = !isDefault && mainTip
                ? aheadBehind(hash, mainTip, repo.remoteCommits)
                : null;
              return (
                <li key={name} className="px-3 py-2.5 flex items-center gap-3 text-sm">
                  <Octicon icon="branch" size={14} className="text-[#8b949e]" />
                  <span className="font-mono text-[#58a6ff] bg-[#388bfd26] px-1.5 py-0.5 rounded-md text-xs">
                    {name}
                  </span>
                  {isDefault && (
                    <span className="text-[11px] text-[#8b949e] border border-[#30363d] rounded-full px-2 py-0.5">
                      Default
                    </span>
                  )}
                  <span className="text-xs text-[#8b949e] truncate flex-1">
                    {tip ? `${tip.message} · ${timeAgo(tip.timestamp)}` : '(vacía)'}
                  </span>
                  {ab && (
                    <span
                      className="text-xs text-[#8b949e] font-mono flex-shrink-0"
                      title={`${ab.ahead} commit(s) por delante y ${ab.behind} por detrás de ${DEFAULT_BRANCH}`}
                    >
                      ↑{ab.ahead} ↓{ab.behind}
                    </span>
                  )}
                  <span className="font-mono text-xs text-[#8b949e] flex-shrink-0">{hash?.slice(0, 7)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
