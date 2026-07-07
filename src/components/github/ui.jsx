import Octicon from './Octicon';

// Piezas visuales pequeñas compartidas por las pestañas de la vista GitHub.

// Chip de rama al estilo GitHub.
export function BranchChip({ name }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md text-xs bg-[#388bfd26] text-[#58a6ff]">{name}</code>
  );
}

// Pastilla de estado del PR (Open / Merged / Closed) como la de GitHub.
export function StatePill({ state }) {
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

