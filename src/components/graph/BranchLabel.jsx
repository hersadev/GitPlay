export default function BranchLabel({ name, x, y, isActive }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        x={-4}
        y={-12}
        width={name.length * 7 + 8}
        height={16}
        rx={4}
        fill={isActive ? '#16a34a' : '#1e40af'}
      />
      <text fontSize={10} fill="white" dy="0.1em">
        {name}
      </text>
    </g>
  );
}
