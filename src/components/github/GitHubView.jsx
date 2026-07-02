import { useState } from 'react';
import { motion } from 'framer-motion';

// Vista "GitHub" del remoto simulado, imitando la interfaz real (tema oscuro):
// pestaña Code con los archivos que hay en origin, Pull requests con el flujo
// completo (banner de rama recién pusheada, caja de merge, cerrar sin merge)
// y Branches con ahead/behind respecto a la rama por defecto.

const DEFAULT_BRANCH = 'main';

// Octicons de GitHub (MIT), 16px.
const ICONS = {
  repo: 'M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z',
  code: 'm11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z',
  pullRequest: 'M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z',
  merge: 'M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z',
  branch: 'M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628a2.25 2.25 0 0 1-1.5-2.122ZM4.25 4a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0ZM5 12.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z',
  commit: 'M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-3.93 2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  file: 'M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z',
  check: 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
};

function Octicon({ icon, size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" className={`flex-shrink-0 ${className}`} aria-hidden="true">
      <path d={ICONS[icon]} />
    </svg>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'hace unos segundos';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d !== 1 ? 's' : ''}`;
}

function collectAncestors(hash, commitsMap) {
  const seen = new Set();
  const stack = [hash];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    const c = commitsMap.get(cur);
    if (c) stack.push(c.parent, c.secondParent);
  }
  return seen;
}

function aheadBehind(tip, baseTip, commitsMap) {
  const a = collectAncestors(tip, commitsMap);
  const b = collectAncestors(baseTip, commitsMap);
  let ahead = 0;
  let behind = 0;
  a.forEach((h) => { if (!b.has(h)) ahead++; });
  b.forEach((h) => { if (!a.has(h)) behind++; });
  return { ahead, behind };
}

// Chip de rama al estilo GitHub.
function BranchChip({ name }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md text-xs bg-[#388bfd26] text-[#58a6ff]">{name}</code>
  );
}

// Pastilla de estado del PR (Open / Merged / Closed) como la de GitHub.
function StatePill({ state }) {
  const cfg = {
    open: { bg: 'bg-[#238636]', icon: 'pullRequest', label: 'Open' },
    merged: { bg: 'bg-[#8957e5]', icon: 'merge', label: 'Merged' },
    closed: { bg: 'bg-[#da3633]', icon: 'pullRequest', label: 'Closed' },
  }[state] ?? { bg: 'bg-gray-600', icon: 'pullRequest', label: state };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold text-white ${cfg.bg}`}>
      <Octicon icon={cfg.icon} size={14} />
      {cfg.label}
    </span>
  );
}

const PR_ROW_ICON = {
  open: { icon: 'pullRequest', color: 'text-[#3fb950]' },
  merged: { icon: 'merge', color: 'text-[#a371f7]' },
  closed: { icon: 'pullRequest', color: 'text-[#f85149]' },
};

const BTN_GREEN = 'bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3 py-1.5 rounded-md';
const BTN_SUBTLE = 'bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-md';

// ── Pestaña Code ────────────────────────────────────────────────────────

function CodeTab({ repo, onOpenFile }) {
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

// ── Nueva Pull Request ──────────────────────────────────────────────────

function NewPRForm({ repo, onSubmit, onCancel, initialFrom }) {
  // En GitHub un PR compara ramas DEL REMOTO: solo se ofrecen las pusheadas.
  const remoteBranches = [...(repo.remoteBranches?.keys?.() ?? [])];

  const [from, setFrom] = useState(initialFrom ?? remoteBranches.find((b) => b !== DEFAULT_BRANCH) ?? remoteBranches[0] ?? '');
  const [into, setInto] = useState(remoteBranches.includes(DEFAULT_BRANCH) ? DEFAULT_BRANCH : remoteBranches[0] ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');

  if (remoteBranches.length === 0) {
    return (
      <div className="p-4 text-sm text-[#8b949e] text-center">
        Necesitas pushear al menos una rama a origin antes de abrir un PR.<br />
        <code className="text-gray-300">git push origin &lt;rama&gt;</code>
      </div>
    );
  }

  function submit() {
    if (!from || !into) return setErr('Selecciona rama origen y destino.');
    if (from === into) return setErr('Origen y destino no pueden ser iguales.');
    const res = onSubmit({ from, into, title, body });
    if (res && !res.ok) setErr(res.output);
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-white font-semibold">Comparando cambios</h3>
      {/* Barra base ← compare como la de GitHub */}
      <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm flex-wrap">
        <Octicon icon="pullRequest" size={14} className="text-[#8b949e]" />
        <span className="text-xs text-[#8b949e]">base:</span>
        <select
          value={into}
          onChange={(e) => setInto(e.target.value)}
          className="bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-1.5 py-1 font-semibold"
        >
          {remoteBranches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="text-[#8b949e]">←</span>
        <span className="text-xs text-[#8b949e]">compare:</span>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-1.5 py-1 font-semibold"
        >
          {remoteBranches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <label className="text-xs text-[#8b949e] block">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${from} → ${into}`}
          className="w-full mt-1 bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none"
        />
      </label>
      <label className="text-xs text-[#8b949e] block">
        Descripción (opcional)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Deja un comentario"
          className="w-full mt-1 bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-md px-2 py-1.5 resize-none focus:border-[#58a6ff] outline-none"
        />
      </label>
      {err && <p className="text-xs text-[#f85149] whitespace-pre-wrap">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className={BTN_SUBTLE}>Cancelar</button>
        <button onClick={submit} className={BTN_GREEN}>Create pull request</button>
      </div>
    </div>
  );
}

// ── Detalle de una Pull Request ─────────────────────────────────────────

function PRDetail({ pr, repo, onMerge, onClosePR, onBack, onOpenFile }) {
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

// ── Vista principal ─────────────────────────────────────────────────────

export default function GitHubView({ repo, onClose, onOpenPR, onMergePR, onClosePR, onOpenFile }) {
  const pulls = repo.pullRequests ?? [];
  const [tab, setTab] = useState(pulls.some((p) => p.state === 'open') ? 'pulls' : 'code');
  const [selectedPR, setSelectedPR] = useState(null);
  const [newPROpen, setNewPROpen] = useState(false);
  const [prefillFrom, setPrefillFrom] = useState(null);
  const [prFilter, setPrFilter] = useState('open');

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

  function handleSubmitNewPR({ from, into, title, body }) {
    const res = onOpenPR({ from, into, title, body });
    if (res.ok) {
      setNewPROpen(false);
      setPrefillFrom(null);
      setPrFilter('open');
    }
    return res;
  }

  const TABS = [
    { id: 'code', icon: 'code', label: 'Code' },
    { id: 'pulls', icon: 'pullRequest', label: 'Pull requests', count: openCount },
    { id: 'branches', icon: 'branch', label: 'Branches', count: branches.length },
  ];

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
        className="bg-[#0d1117] border border-[#30363d] rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 pt-3 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 text-sm">
              <span className="text-lg" aria-hidden="true">🐙</span>
              <Octicon icon="repo" size={16} className="text-[#8b949e]" />
              <span className="text-[#58a6ff]">tu-equipo</span>
              <span className="text-[#8b949e]">/</span>
              <span className="text-[#58a6ff] font-semibold">taskflow</span>
              <span className="text-[11px] text-[#8b949e] border border-[#30363d] rounded-full px-2 py-0.5 ml-1">
                Public
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-[#8b949e] hover:text-white text-xl leading-none"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <nav className="flex gap-1 mt-2 text-sm">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSelectedPR(null); setNewPROpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[#f78166] text-white font-semibold'
                    : 'border-transparent text-[#8b949e] hover:text-white'
                }`}
              >
                <Octicon icon={t.icon} size={14} />
                {t.label}
                {t.count > 0 && (
                  <span className="text-[11px] bg-[#30363d] text-gray-300 rounded-full px-1.5 leading-4 font-normal">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto">
          {tab === 'code' && <CodeTab repo={repo} onOpenFile={onOpenFile} />}

          {tab === 'pulls' && (
            selectedPR ? (
              <PRDetail
                pr={pulls.find((p) => p.id === selectedPR)}
                repo={repo}
                onMerge={(id) => onMergePR(id)}
                onClosePR={(id) => onClosePR?.(id)}
                onBack={() => setSelectedPR(null)}
                onOpenFile={onOpenFile}
              />
            ) : newPROpen ? (
              <NewPRForm
                repo={repo}
                onSubmit={handleSubmitNewPR}
                onCancel={() => { setNewPROpen(false); setPrefillFrom(null); }}
                initialFrom={prefillFrom ?? undefined}
              />
            ) : (
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
                      onClick={() => { setPrefillFrom(name); setNewPROpen(true); }}
                      className={`${BTN_GREEN} ml-auto`}
                    >
                      Compare & pull request
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      onClick={() => setPrFilter('open')}
                      className={`inline-flex items-center gap-1.5 ${prFilter === 'open' ? 'text-white font-semibold' : 'text-[#8b949e] hover:text-white'}`}
                    >
                      <Octicon icon="pullRequest" size={14} />
                      {openCount} Open
                    </button>
                    <button
                      onClick={() => setPrFilter('closed')}
                      className={`inline-flex items-center gap-1.5 ${prFilter === 'closed' ? 'text-white font-semibold' : 'text-[#8b949e] hover:text-white'}`}
                    >
                      <Octicon icon="check" size={14} />
                      {closedCount} Closed
                    </button>
                  </div>
                  <button onClick={() => setNewPROpen(true)} className={BTN_GREEN}>
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
                              onClick={() => setSelectedPR(pr.id)}
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
            )
          )}

          {tab === 'branches' && (
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
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
