export default function BranchList({ branches = new Map(), current }) {
  const entries = [...branches.keys()];
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Ramas</p>
      {entries.length === 0 ? (
        <p className="text-gray-600 italic">Sin ramas</p>
      ) : (
        <ul className="space-y-0.5">
          {entries.map((name) => (
            <li key={name} className={`font-mono truncate ${name === current ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
              {name === current ? '* ' : '  '}{name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
