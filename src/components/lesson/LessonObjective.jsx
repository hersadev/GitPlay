export default function LessonObjective({ objectives = [], progress }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Objetivos</h3>
      <ul className="space-y-1">
        {objectives.map((obj, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className={progress > i ? 'text-green-400' : 'text-gray-600'}>
              {progress > i ? '✓' : '○'}
            </span>
            <span className={progress > i ? 'text-gray-300 line-through' : 'text-gray-300'}>
              {obj.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
