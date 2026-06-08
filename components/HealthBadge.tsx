import type { HealthBand } from '@/lib/types';

// Per the design system:
//   Healthy  ≥ 75 → green   #2a9c5e
//   At watch ≥ 50 → amber   #d97706
//   Critical < 50 → signal  #f06a2a (the brand orange)
// The data layer's band ('green' | 'amber' | 'red') maps onto this scale.
const BAND_COLOR: Record<HealthBand, { fg: string; bg: string; label: string }> = {
  green: { fg: '#2a9c5e', bg: '#e1f3e8', label: 'Healthy' },
  amber: { fg: '#d97706', bg: '#fcecd9', label: 'At watch' },
  red: { fg: '#f06a2a', bg: '#fde8dd', label: 'Critical' },
};

export function HealthRing({
  score,
  band,
  size = 82,
}: {
  score: number;
  band: HealthBand;
  size?: number;
}) {
  const { fg, label } = BAND_COLOR[band];
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - score / 100);
  const stroke = size * 0.05;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e5e5" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={fg}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[1px]">
        <span
          className="num leading-none"
          style={{ color: fg, fontSize: size * 0.27, fontWeight: 600 }}
        >
          {score}
        </span>
        <span
          className="uppercase"
          style={{ color: '#8a8a8a', fontSize: size * 0.12, letterSpacing: '0.06em' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function SmallHealthBar({ score, band }: { score: number; band: HealthBand }) {
  const { fg } = BAND_COLOR[band];
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-[3px] w-11 shrink-0 overflow-hidden rounded-[2px] bg-line">
        <div
          className="h-full rounded-[2px]"
          style={{ width: `${score}%`, background: fg }}
        />
      </div>
      <span
        className="num min-w-[20px] text-right text-[12.5px] font-semibold"
        style={{ color: fg }}
      >
        {score}
      </span>
    </div>
  );
}

export function bandColor(band: HealthBand) {
  return BAND_COLOR[band];
}
