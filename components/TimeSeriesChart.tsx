'use client';
import { useState } from 'react';
import type { MetricSnapshot } from '@/lib/types';

type Metric = 'health' | 'usage' | 'nps';

const METRICS: { key: Metric; label: string; color: string; min: number; max: number }[] = [
  { key: 'health', label: 'Health', color: '#f06a2a', min: 0, max: 100 },
  { key: 'usage', label: 'Usage', color: '#3b82f6', min: 0, max: 100 },
  { key: 'nps', label: 'NPS', color: '#7b5ee6', min: -100, max: 100 },
];

function fmtWeek(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function TimeSeriesChart({ history }: { history: MetricSnapshot[] }) {
  const [metric, setMetric] = useState<Metric>('health');
  const meta = METRICS.find((m) => m.key === metric)!;

  if (history.length < 2) {
    return <p className="text-[12.5px] text-ink-4">Not enough history to chart.</p>;
  }

  const W = 560;
  const H = 160;
  const padL = 30;
  const padR = 12;
  const padT = 12;
  const padB = 22;

  const values = history.map((h) => h[metric]);
  const { min, max } = meta;
  const range = max - min || 1;
  const stepX = (W - padL - padR) / (history.length - 1);

  const pts = values.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + (H - padT - padB) * (1 - (v - min) / range);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - padB} L${pts[0][0].toFixed(1)},${H - padB} Z`;

  // Gridlines at 0/50/100 (or band thresholds for health)
  const gridVals = metric === 'nps' ? [-100, 0, 100] : [0, 50, 100];
  const last = values[values.length - 1];
  const first = values[0];
  const delta = last - first;

  return (
    <div>
      <div className="mb-3 flex items-center gap-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={[
              'rounded-rect px-[10px] py-[4px] text-[11px] font-medium transition-colors',
              metric === m.key
                ? 'bg-ink-1 text-white'
                : 'border border-line text-ink-3 hover:text-ink-1',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
        <span className="ml-auto text-[11.5px] text-ink-4">
          {meta.label} {delta >= 0 ? '+' : ''}
          {delta} over {history.length} weeks
        </span>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {gridVals.map((gv) => {
          const y = padT + (H - padT - padB) * (1 - (gv - min) / range);
          return (
            <g key={gv}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#eee" strokeWidth="1" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#b8b8b8">
                {gv}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={meta.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${metric})`} />
        <path d={line} fill="none" stroke={meta.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3.5 : 0} fill={meta.color} />
        ))}
        {/* X labels: first, middle, last */}
        {[0, Math.floor(history.length / 2), history.length - 1].map((i) => (
          <text
            key={i}
            x={padL + i * stepX}
            y={H - 6}
            textAnchor={i === 0 ? 'start' : i === history.length - 1 ? 'end' : 'middle'}
            fontSize="9"
            fill="#b8b8b8"
          >
            {fmtWeek(history[i].week)}
          </text>
        ))}
      </svg>
    </div>
  );
}
