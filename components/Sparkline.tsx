// Tiny inline-SVG sparkline. Server-renderable (no client JS).
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = '#f06a2a',
  strokeWidth = 1.5,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = strokeWidth;
  const stepX = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });

  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={strokeWidth * 1.4} fill={color} />
    </svg>
  );
}
