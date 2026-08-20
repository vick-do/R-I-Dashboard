/**
 * The small trend line inside a stat tile.
 */
export function Sparkline({
  points,
  width = 60,
  height = 24,
  color = '#0e8fa2',
  label,
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  label?: string;
}) {
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = (width - 4) / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = 2 + index * step;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return [x, y] as const;
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label={label ?? `Trend across ${points.length} periods`}
      className="shrink-0"
    >
      <path d={path} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* A 2px surface ring keeps the endpoint separable from the line. */}
      <circle cx={lastX} cy={lastY} r="2.25" fill={color} stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  );
}
