import StagingArea from './StagingArea';
import BranchList from './BranchList';

export default function StatusPanel({ repo }) {
  return (
    <aside className="w-56 flex flex-col gap-4 p-4 bg-gray-900 border-l border-gray-700 overflow-y-auto text-sm">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">HEAD</p>
        <p className="text-yellow-300 font-mono">{repo?.HEAD ?? '—'}</p>
      </div>
      <StagingArea files={repo?.stagingArea ?? []} />
      <BranchList branches={repo?.branches ?? new Map()} current={repo?.HEAD} />
    </aside>
  );
}
