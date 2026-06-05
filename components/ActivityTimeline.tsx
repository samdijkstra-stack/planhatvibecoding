'use client';
import type { Activity } from '@/lib/types';

const TYPE_META: Record<Activity['type'], { icon: string; label: string; color: string }> = {
  note: { icon: '📝', label: 'Note', color: 'bg-ink-100 text-ink-700 border-ink-200' },
  call: { icon: '📞', label: 'Call', color: 'bg-brand-50 text-brand-700 border-brand-500/30' },
  email: { icon: '✉️', label: 'Email', color: 'bg-good-50 text-good-700 border-good-500/30' },
  meeting: { icon: '🤝', label: 'Meeting', color: 'bg-warn-50 text-warn-700 border-warn-500/30' },
  system: { icon: '⚙️', label: 'System', color: 'bg-ink-50 text-ink-500 border-ink-200' },
};

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) {
    const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    return `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-ink-500">
        No activity yet. Log a touchpoint below.
      </div>
    );
  }
  return (
    <ol className="card divide-y divide-ink-100">
      {activities.map((a) => {
        const m = TYPE_META[a.type];
        return (
          <li key={a.id} className="flex gap-3 p-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${m.color}`}
              aria-hidden
            >
              <span>{m.icon}</span>
            </div>
            <div className="flex-1">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  {m.label} <span className="text-ink-400">· {a.author}</span>
                </div>
                <div className="text-xs text-ink-400" title={new Date(a.timestamp).toLocaleString()}>
                  {relativeTime(a.timestamp)}
                </div>
              </div>
              <div className="text-sm text-ink-800">{a.text}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
