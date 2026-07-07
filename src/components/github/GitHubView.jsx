import { useState } from 'react';
import { motion } from 'framer-motion';
import Octicon from './Octicon';
import CodeTab from './CodeTab';
import PullsList from './PullsList';
import NewPRForm from './NewPRForm';
import PRDetail from './PRDetail';
import BranchesTab from './BranchesTab';

// Vista "GitHub" del remoto simulado, imitando la interfaz real (tema oscuro):
// pestaña Code con los archivos que hay en origin, Pull requests con el flujo
// completo (banner de rama recién pusheada, caja de merge, cerrar sin merge)
// y Branches con ahead/behind respecto a la rama por defecto.
// Cada pestaña vive en su propio archivo; aquí solo queda el marco
// (cabecera, navegación, footer) y el estado de qué se está viendo.

export default function GitHubView({ repo, onClose, onOpenPR, onMergePR, onClosePR, onOpenFile }) {
  const pulls = repo.pullRequests ?? [];
  const [tab, setTab] = useState(pulls.some((p) => p.state === 'open') ? 'pulls' : 'code');
  const [selectedPR, setSelectedPR] = useState(null);
  const [newPROpen, setNewPROpen] = useState(false);
  const [prefillFrom, setPrefillFrom] = useState(null);
  const [prFilter, setPrFilter] = useState('open');

  const branches = [...(repo.remoteBranches?.entries?.() ?? [])];
  const openCount = pulls.filter((p) => p.state === 'open').length;

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
              <PullsList
                repo={repo}
                pulls={pulls}
                prFilter={prFilter}
                onChangeFilter={setPrFilter}
                onSelectPR={setSelectedPR}
                onNewPR={(from = null) => { setPrefillFrom(from); setNewPROpen(true); }}
              />
            )
          )}

          {tab === 'branches' && <BranchesTab repo={repo} />}
        </div>

        <footer className="px-4 py-1.5 bg-[#161b22] border-t border-[#30363d] text-center flex-shrink-0">
          <p className="text-[11px] text-[#8b949e]">
            Simulador educativo con fines didácticos. No está afiliado a GitHub, Inc. ni cuenta con su respaldo.
          </p>
        </footer>
      </motion.div>
    </motion.div>
  );
}
