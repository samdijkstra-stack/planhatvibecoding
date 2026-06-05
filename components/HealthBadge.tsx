import type { HealthBand } from '@/lib/types';

const STYLES: Record<HealthBand, { dot: string; chip: string; text: string }> = {
  green: {
    dot: 'bg-good-500',
    chip: 'bg-good-50 border-good-500/30 text-good-700',
    text: 'text-good-700',
  },
  amber: {
    dot: 'bg-warn-500',
    chip: 'bg-warn-50 border-warn-500/30 text-warn-700',
    text: 'text-warn-700',
  },
  red: {
    dot: 'bg-bad-500',
    chip: 'bg-bad-50 border-bad-500/30 text-bad-700',
    text: 'text-bad-700',
  },
};

export function HealthDot({ band }: { band: HealthBand }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${STYLES[band].dot}`} aria-label={band} />;
}

export function HealthBadge({
  score,
  band,
  size = 'sm',
}: {
  score: number;
  band: HealthBand;
  size?: 'sm' | 'lg';
}) {
  const s = STYLES[band];
  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.chip}`}>
        <span className={`h-3 w-3 rounded-full ${s.dot}`} />
        <div>
          <div className={`text-3xl font-semibold leading-none ${s.text}`}>{score}</div>
          <div className="mt-0.5 text-xs font-medium uppercase tracking-wide opacity-80">{band}</div>
        </div>
      </div>
    );
  }
  return (
    <span className={`chip ${s.chip}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      <span className="tabular-nums">{score}</span>
    </span>
  );
}
