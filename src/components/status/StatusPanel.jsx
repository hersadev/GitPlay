function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-xs text-gray-600 italic">{text}</p>;
}

export default function StatusPanel({ repo, onOpenFile }) {
  const {
    initialized,
    commits = new Map(),
    branches = new Map(),
    tags = new Map(),
    HEAD,
    stagingArea = new Map(),
    workingDirectory = new Map(),
    mergeState = null,
    stash = [],
  } = repo ?? {};

  const isDetached = initialized && !branches.has(HEAD);
  const currentHash = isDetached ? HEAD : branches.get(HEAD) ?? null;

  // Last 4 commits reachable from HEAD
  const recentCommits = [];
  let cur = currentHash;
  while (cur && recentCommits.length < 4) {
    const c = commits.get(cur);
    if (!c) break;
    recentCommits.push(c);
    cur = c.parent;
  }

  const conflicts = mergeState?.conflicts ? [...mergeState.conflicts] : [];

  return (
    <aside className="w-60 flex flex-col gap-4 p-4 bg-gray-900 border-l border-gray-700 overflow-y-auto text-sm">

      {/* Merge banner */}
      {mergeState && (
        <div className="rounded-md border border-orange-700 bg-orange-900/30 px-3 py-2">
          <p className="text-xs uppercase tracking-wider text-orange-300 font-semibold">
            ⚠ Merge en curso
          </p>
          <p className="text-xs text-orange-100 mt-1">
            Mergeando <span className="font-mono">{mergeState.fromBranch}</span>
          </p>
          {conflicts.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {conflicts.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-red-400 flex-shrink-0">✗</span>
                  <button
                    onClick={() => onOpenFile?.(f, 'working')}
                    className="text-red-200 truncate hover:text-red-100 hover:underline text-left"
                  >
                    {f}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-orange-300/80 mt-2 leading-snug">
            Edita los archivos, quita los marcadores <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, haz <code>git add</code> y commitea. O <code>git merge --abort</code>.
          </p>
        </div>
      )}

      {/* Repo state */}
      <Section title="Repositorio">
        {!initialized ? (
          <p className="text-xs text-gray-500">Sin inicializar</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDetached ? 'bg-yellow-400' : 'bg-green-400'}`} />
              <span className="font-mono text-xs text-white truncate">
                {isDetached ? `HEAD detached @ ${HEAD}` : HEAD}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {commits.size} commit{commits.size !== 1 ? 's' : ''}
              {tags.size > 0 && ` · ${tags.size} tag${tags.size !== 1 ? 's' : ''}`}
              {stash.length > 0 && ` · stash(${stash.length})`}
            </p>
          </div>
        )}
      </Section>

      {/* Staging area */}
      <Section title="Staging">
        {stagingArea.size === 0 ? (
          <Empty text="Vacío" />
        ) : (
          <ul className="space-y-0.5">
            {[...stagingArea.keys()].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-green-400 font-bold flex-shrink-0">+</span>
                <button
                  onClick={() => onOpenFile?.(f, 'staged')}
                  className="text-green-300 truncate hover:text-green-200 hover:underline text-left"
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Working directory */}
      {workingDirectory.size > 0 && (
        <Section title="Sin preparar">
          <ul className="space-y-0.5">
            {[...workingDirectory.keys()].map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-yellow-400 font-bold flex-shrink-0">~</span>
                <button
                  onClick={() => onOpenFile?.(f, 'working')}
                  className="text-yellow-300 truncate hover:text-yellow-200 hover:underline text-left"
                >
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Branches */}
      <Section title="Ramas">
        {branches.size === 0 ? (
          <Empty text="Sin ramas" />
        ) : (
          <ul className="space-y-0.5">
            {[...branches.entries()].map(([name, hash]) => {
              const isActive = name === HEAD;
              return (
                <li key={name} className="flex items-center gap-1.5 text-xs font-mono">
                  <span className={`flex-shrink-0 ${isActive ? 'text-green-400' : 'text-gray-600'}`}>
                    {isActive ? '▶' : '·'}
                  </span>
                  <span className={`truncate ${isActive ? 'text-green-300 font-semibold' : 'text-gray-400'}`}>
                    {name}
                  </span>
                  {hash && (
                    <span className="text-gray-600 ml-auto flex-shrink-0">{hash}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Tags */}
      {tags.size > 0 && (
        <Section title="Tags">
          <ul className="space-y-0.5">
            {[...tags.entries()].map(([name, hash]) => (
              <li key={name} className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-purple-400 flex-shrink-0">◆</span>
                <span className="text-purple-300 truncate">{name}</span>
                <span className="text-gray-600 ml-auto flex-shrink-0">{hash}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Stash */}
      {stash.length > 0 && (
        <Section title={`Stash (${stash.length})`}>
          <ul className="space-y-0.5">
            {stash.map((entry, i) => (
              <li key={i} className="text-xs text-orange-300 font-mono truncate">
                stash@{'{'}{ i}{'}'}: {entry.message}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Recent commits */}
      <Section title="Últimos commits">
        {recentCommits.length === 0 ? (
          <Empty text="Sin commits" />
        ) : (
          <ul className="space-y-2">
            {recentCommits.map((c) => {
              const branchesHere = [...branches.entries()]
                .filter(([, h]) => h === c.hash)
                .map(([n]) => n);
              const tagsHere = [...tags.entries()]
                .filter(([, h]) => h === c.hash)
                .map(([n]) => n);
              return (
                <li key={c.hash} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 font-mono text-xs flex-shrink-0">{c.hash}</span>
                    {branchesHere.map((n) => (
                      <span key={n} className={`text-[10px] px-1 rounded font-mono ${n === HEAD ? 'bg-green-700 text-green-100' : 'bg-blue-900 text-blue-300'}`}>{n}</span>
                    ))}
                    {tagsHere.map((n) => (
                      <span key={n} className="text-[10px] px-1 rounded font-mono bg-purple-900 text-purple-300">{n}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-300 truncate pl-0.5">{c.message}</p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

    </aside>
  );
}
