// Leyenda flotante con el color asignado a cada rama.
export default function BranchLegend({ branchColor, HEAD }) {
  if (branchColor.size <= 1) return null;
  return (
    <div className="absolute top-3 right-3 bg-gray-900/80 border border-gray-700 rounded-md px-2 py-1.5 flex flex-col gap-1 backdrop-blur-sm">
      {[...branchColor.entries()].map(([name, color]) => (
        <div key={name} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className={`text-[10px] font-mono ${name === HEAD ? 'text-white font-semibold' : 'text-gray-400'}`}>
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
