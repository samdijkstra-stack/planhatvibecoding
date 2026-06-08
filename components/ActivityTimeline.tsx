'use client';
import type { Activity } from '@/lib/types';

const ACT_STYLES: Record<
  string,
  { bg: string; color: string; label: string; char: string }
> = {
  email: { bg: '#e5efff', color: '#3b82f6', label: 'Email', char: '✉' },
  meeting: { bg: '#e1f3e8', color: '#2a9c5e', label: 'Meeting', char: '⟳' },
  system: { bg: '#f4f4f4', color: '#8a8a8a', label: 'System', char: '⚙' },
  call: { bg: '#ede8fb', color: '#7b5ee6', label: 'Call', char: '↗' },
  note: { bg: '#fcecd9', color: '#d97706', label: 'Note', char: '◻' },
  alert: { bg: '#fde8dd', color: '#f06a2a', label: 'Alert', char: '!' },
};

function ActivityIcon({ type }: { type: Activity['type'] | 'alert' }) {
  const s = ACT_STYLES[type] ?? ACT_STYLES.note;
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-[12px] font-bold"
      style={{ background: s.bg, color: s.color }}
      aria-hidden
    >
      {s.char}
    </div>
  );
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) {
    const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    .replace(',', '');
}

export default function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <div className="text-[12.5px] text-ink-4">No activity yet. Log a touchpoint below.</div>;
  }
  return (
    <div className="flex flex-col gap-[14px]">
      {activities.map((a) => {
        const s = ACT_STYLES[a.type] ?? ACT_STYLES.note;
        return (
          <div key={a.id} className="flex items-start gap-3">
            <ActivityIcon type={a.type} />
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-[6px]">
                <span
                  className="text-[11.5px] font-semibold capitalize"
                  style={{ color: s.color }}
                >
                  {s.label}
                </span>
                <span className="text-[11px] text-ink-4">· {a.author}</span>
                <span
                  className="ml-auto text-[11px] text-ink-5"
                  title={new Date(a.timestamp).toLocaleString()}
                >
                  {relativeTime(a.timestamp)}
                </span>
              </div>
              <div className="mt-[2px] text-[12.5px] leading-[1.55] text-ink-3">{a.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
