import { parseIgnoreRules, matchesIgnore } from '../../utils/ignore';

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

export default function StatusPanel({ repo, onOpenFile, onStage, onUnstage }) {
  const {
    initialized,
    commits = new Map(),
    branches = new Map(),
    tags = new Map(),
    HEAD,
    stagingArea = new Map(),
    workingDirectory = new Map(),
    mergeState = null,
    rebaseState = null,
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
  const rebaseConflicts = rebaseState?.conflicts ? [...rebaseState.conflicts] : [];

  // Árbol del commit actual, para distinguir untracked (?) de modificado (~).
  const currentTree = (() => {
    const c = currentHash ? commits.get(currentHash) : null;
    return c?.tree instanceof Map ? c.tree : new Map();
  })();

  // Reglas de .gitignore activas (mismo criterio que el motor).
  const ignoreRules = parseIgnoreRules(
    workingDirectory.get('.gitignore') ??
    stagingArea.get('.gitignore') ??
    currentTree.get('.gitignore')
  );

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
            Pulsa el archivo para resolverlo visualmente, o edítalo a mano y haz <code>git add</code> + <code>git commit</code>. Para cancelar: <code>git merge --abort</code>.
          </p>
        </div>
      )}

      {/* Rebase banner */}
      {rebaseState && (
        <div className="rounded-md border border-purple-700 bg-purple-900/30 px-3 py-2">
          <p className="text-xs uppercase tracking-wider text-purple-300 font-semibold">
            ⚠ Rebase en curso
          </p>
          <p className="text-xs text-purple-100 mt-1">
            Reaplicando sobre <span className="font-mono">{rebaseState.target}</span>
          </p>
          {rebaseConflicts.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {rebaseConflicts.map((f) => (
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
          <p className="text-[10px] text-purple-300/80 mt-2 leading-snug">
            Pulsa el archivo para resolverlo visualmente, haz <code>git add</code> y sigue con <code>git rebase --continue</code>. Para cancelar: <code>git rebase --abort</code>.
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
              <li key={f} className="group flex items-center gap-1.5 text-xs font-mono">
                <span className="text-green-400 font-bold flex-shrink-0">+</span>
                <button
                  onClick={() => onOpenFile?.(f, 'staged')}
                  className="text-green-300 truncate hover:text-green-200 hover:underline text-left"
                >
                  {f}
                </button>
                {onUnstage && (
                  <button
                    onClick={() => onUnstage(f)}
                    title={`Sacar del staging: git restore --staged ${f}`}
                    className="ml-auto flex-shrink-0 px-1 rounded text-gray-600 opacity-0 group-hover:opacity-100 hover:text-yellow-300 hover:bg-gray-800 transition-opacity"
                  >
                    ↩
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Working directory: ~ modificado (trackeado) · ? sin seguimiento */}
      {workingDirectory.size > 0 && (
        <Section title="Sin preparar">
          <ul className="space-y-0.5">
            {[...workingDirectory.keys()].map((f) => {
              const tracked = currentTree.has(f) || stagingArea.has(f);
              const ignored = !tracked && matchesIgnore(f, ignoreRules);
              return (
                <li key={f} className="group flex items-center gap-1.5 text-xs font-mono">
                  <span
                    className={`font-bold flex-shrink-0 ${
                      tracked ? 'text-yellow-400' : ignored ? 'text-gray-700' : 'text-gray-500'
                    }`}
                    title={tracked ? 'Modificado' : ignored ? 'Ignorado por .gitignore' : 'Sin seguimiento (untracked)'}
                  >
                    {tracked ? '~' : ignored ? '∅' : '?'}
                  </span>
                  <button
                    onClick={() => onOpenFile?.(f, 'working')}
                    className={`truncate hover:underline text-left ${
                      tracked
                        ? 'text-yellow-300 hover:text-yellow-200'
                        : ignored
                        ? 'text-gray-600 hover:text-gray-500 line-through'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {f}
                  </button>
                  {ignored && (
                    <span className="text-[9px] text-gray-600 flex-shrink-0">ignorado</span>
                  )}
                  {onStage && !ignored && (
                    <button
                      onClick={() => onStage(f)}
                      title={`Preparar para commit: git add ${f}`}
                      className="ml-auto flex-shrink-0 px-1 rounded text-gray-600 opacity-0 group-hover:opacity-100 hover:text-green-300 hover:bg-gray-800 transition-opacity"
                    >
                      +
                    </button>
                  )}
                </li>
              );
            })}
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
