export default function StagingArea({ files = [] }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Staging area</p>
      {files.length === 0 ? (
        <p className="text-gray-600 italic">Vacío</p>
      ) : (
        <ul className="space-y-0.5">
          {files.map((f) => (
            <li key={f} className="text-green-400 font-mono truncate">
              + {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
