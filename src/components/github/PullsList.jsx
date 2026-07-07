import Octicon from './Octicon';
import { DEFAULT_BRANCH, timeAgo, aheadBehind } from './utils';
import { BranchChip } from './ui';
import { PR_ROW_ICON, BTN_GREEN } from './styles';

// Lista de la pestaña Pull requests: banner de rama recién pusheada,
// filtro Open/Closed y filas de PRs. El detalle y el formulario de nueva PR
// los orquesta GitHubView.
export default function PullsList({ repo, pulls, prFilter, onChangeFilter, onSelectPR, onNewPR }) {
  const branches = [...(repo.remoteBranches?.entries?.() ?? [])];
  const openCount = pulls.filter((p) => p.state === 'open').length;
  const closedCount = pulls.length - openCount;
  const visiblePulls = pulls.filter((p) => (prFilter === 'open' ? p.state === 'open' : p.state !== 'open'));

  // Ramas pusheadas sin PR: candidatas al banner "Compare & pull request".
  const mainTip = repo.remoteBranches?.get?.(DEFAULT_BRANCH);
  const bannerBranches = !mainTip ? [] : branches
    .filter(([name, tip]) =>
      name !== DEFAULT_BRANCH &&
      tip !== mainTip &&
      !pulls.some((p) => p.from === name && (p.state === 'open' || p.state === 'merged')) &&
      aheadBehind(tip, mainTip, repo.remoteCommits).ahead > 0
    )
    .slice(0, 2);

  return (
    <div className="p-4 space-y-3">
      {/* Banner "rama recién pusheada", como el de GitHub */}
      {bannerBranches.map(([name, tip]) => (
        <div key={name} className="flex items-center gap-2 border border-[#30363d] bg-[#161b22] rounded-md px-3 py-2 text-sm flex-wrap">
          <Octicon icon="branch" size={14} className="text-[#8b949e]" />
          <span className="text-gray-300 min-w-0">
            <span className="font-mono font-semibold text-white">{name}</span>{' '}
            <span className="text-[#8b949e]">
              tuvo pushes recientes ({timeAgo(repo.remoteCommits?.get?.(tip)?.timestamp)})
            </span>
          </span>
          <button
            onClick={() => onNewPR(name)}
            className={`${BTN_GREEN} ml-auto`}
          >
            Compare & pull request
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => onChangeFilter('open')}
            className={`inline-flex items-center gap-1.5 ${prFilter === 'open' ? 'text-white font-semibold' : 'text-[#8b949e] hover:text-white'}`}
          >
            <Octicon icon="pullRequest" size={14} />
            {openCount} Open
          </button>
          <button
            onClick={() => onChangeFilter('closed')}
            className={`inline-flex items-center gap-1.5 ${prFilter === 'closed' ? 'text-white font-semibold' : 'text-[#8b949e] hover:text-white'}`}
          >
            <Octicon icon="check" size={14} />
            {closedCount} Closed
          </button>
        </div>
        <button onClick={() => onNewPR()} className={BTN_GREEN}>
          New pull request
        </button>
      </div>

      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {visiblePulls.length === 0 ? (
          <div className="p-8 text-center">
            <Octicon icon="pullRequest" size={24} className="text-[#8b949e] inline-block" />
            <p className="text-white font-semibold mt-2">
              {prFilter === 'open' ? 'No hay pull requests abiertas' : 'No hay pull requests cerradas'}
            </p>
            <p className="text-xs text-[#8b949e] mt-1">
              Pushea una rama con <code className="text-gray-300">git push origin &lt;rama&gt;</code> y ábrela aquí.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#21262d]">
            {visiblePulls.map((pr) => {
              const row = PR_ROW_ICON[pr.state] ?? PR_ROW_ICON.open;
              const when = pr.state === 'merged' ? `mergeado ${timeAgo(pr.mergedAt)}`
                : pr.state === 'closed' ? `cerrado ${timeAgo(pr.closedAt)}`
                : `abierto ${timeAgo(pr.openedAt)}`;
              return (
                <li key={pr.id}>
                  <button
                    onClick={() => onSelectPR(pr.id)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#161b22] flex items-start gap-2.5"
                  >
                    <Octicon icon={row.icon} size={16} className={`${row.color} mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-semibold leading-snug truncate">{pr.title}</p>
                      <p className="text-xs text-[#8b949e] mt-0.5">
                        #{pr.id} {when} por {pr.author} · <BranchChip name={pr.from} /> → <BranchChip name={pr.into} />
                      </p>
                    </div>
                    {pr.commits.length > 0 && (
                      <span className="text-xs text-[#8b949e] flex items-center gap-1 flex-shrink-0">
                        <Octicon icon="commit" size={14} />
                        {pr.commits.length}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
