const typeColor = {
  command: 'text-green-400',
  success: 'text-white',
  error: 'text-red-400',
  info: 'text-yellow-300',
};

function isDiffOutput(text) {
  return typeof text === 'string' && text.startsWith('diff --git ');
}

function classForDiffLine(line) {
  if (line.startsWith('diff --git ') || line.startsWith('index ')) return 'text-gray-500 font-semibold';
  if (line.startsWith('--- ') || line.startsWith('+++ ')) return 'text-gray-400';
  if (line.startsWith('@@')) return 'text-cyan-400';
  if (line.startsWith('+')) return 'text-green-400';
  if (line.startsWith('-')) return 'text-red-400';
  return 'text-gray-300';
}

function DiffBlock({ text }) {
  const lines = text.split('\n');
  return (
    <pre className="leading-snug whitespace-pre-wrap break-all">
      {lines.map((l, i) => (
        <div key={i} className={classForDiffLine(l)}>{l || ' '}</div>
      ))}
    </pre>
  );
}

export default function TerminalOutput({ lines }) {
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.type !== 'command' && isDiffOutput(line.text)) {
          return <DiffBlock key={i} text={line.text} />;
        }
        return (
          <p key={i} className={typeColor[line.type] ?? 'text-gray-400'}>
            {line.type === 'command' && <span className="mr-1">$</span>}
            {line.text}
          </p>
        );
      })}
    </div>
  );
}
