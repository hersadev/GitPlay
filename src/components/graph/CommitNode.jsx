export default function CommitNode({ commit, x, y, isHead, color }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle
        r={16}
        fill={color ?? '#4f46e5'}
        stroke={isHead ? '#fbbf24' : 'transparent'}
        strokeWidth={3}
      />
      <text
        textAnchor="middle"
        dy="0.35em"
        fontSize={10}
        fill="white"
      >
        {commit.hash}
      </text>
    </g>
  );
}
