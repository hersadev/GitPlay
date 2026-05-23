const typeColor = {
  command: 'text-green-400',
  success: 'text-white',
  error: 'text-red-400',
  info: 'text-yellow-300',
};

export default function TerminalOutput({ lines }) {
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <p key={i} className={typeColor[line.type] ?? 'text-gray-400'}>
          {line.type === 'command' && <span className="mr-1">$</span>}
          {line.text}
        </p>
      ))}
    </div>
  );
}
