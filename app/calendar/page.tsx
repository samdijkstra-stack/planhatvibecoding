import Link from 'next/link';
import { listCustomers } from '@/lib/customers';
import { ChurnFlag } from '@/components/ChurnFlag';
import type { CustomerWithHealth } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CalEvent {
  id: string;
  date: Date;
  type: 'renewal' | 'save-play' | 'qbr' | 'check-in';
  customer: CustomerWithHealth;
}

const TYPE_META: Record<CalEvent['type'], { label: string; color: string; bg: string }> = {
  renewal: { label: 'Renewal', color: '#f06a2a', bg: '#fde8dd' },
  'save-play': { label: 'Save play', color: '#c4521e', bg: '#fde8dd' },
  qbr: { label: 'QBR', color: '#2a9c5e', bg: '#e1f3e8' },
  'check-in': { label: 'Check-in', color: '#3b82f6', bg: '#e5efff' },
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfMonday(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function fmtDay(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtWeek(start: Date): string {
  const end = addDays(start, 6);
  const s = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const e = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${s} – ${e}`;
}

function fmtEur(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `€${n.toLocaleString('en-GB')}`;
}

export default async function CalendarPage() {
  const customers = await listCustomers();
  const now = new Date();
  const horizon = addDays(now, 90);

  const events: CalEvent[] = [];

  customers.forEach((c) => {
    const renewalDate = new Date(c.renewal_date);

    // Renewal events in next 90 days
    if (renewalDate >= now && renewalDate <= horizon) {
      events.push({ id: `${c.id}_renewal`, date: renewalDate, type: 'renewal', customer: c });
    }

    // Save plays for churn-risk accounts with renewal ≤ 60 days
    if (c.churnRisk && c.daysToRenewal <= 60) {
      const saveDate =
        renewalDate > addDays(now, 10) ? addDays(renewalDate, -10) : addDays(now, 2);
      if (saveDate >= now && saveDate <= horizon) {
        events.push({ id: `${c.id}_save`, date: saveDate, type: 'save-play', customer: c });
      }
    }

    // QBRs — Enterprise accounts with renewal in next 90d, scheduled 14d before
    if (c.tier === 'Enterprise' && renewalDate >= now && renewalDate <= horizon) {
      const qbrDate = addDays(renewalDate, -14);
      if (qbrDate >= now && qbrDate <= horizon) {
        events.push({ id: `${c.id}_qbr`, date: qbrDate, type: 'qbr', customer: c });
      }
    }

    // Scheduled check-ins for red-band accounts with renewal > 60 days
    if (c.health.band === 'red' && c.daysToRenewal > 60) {
      const checkIn = addDays(now, 7 + (customers.indexOf(c) % 14));
      if (checkIn <= horizon) {
        events.push({ id: `${c.id}_checkin`, date: checkIn, type: 'check-in', customer: c });
      }
    }
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by ISO week start
  const weeks = new Map<string, { weekStart: Date; events: CalEvent[] }>();
  events.forEach((ev) => {
    const ws = startOfMonday(ev.date);
    const key = ws.toISOString();
    if (!weeks.has(key)) weeks.set(key, { weekStart: ws, events: [] });
    weeks.get(key)!.events.push(ev);
  });

  const weekEntries = Array.from(weeks.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );

  const counts = {
    renewal: events.filter((e) => e.type === 'renewal').length,
    save: events.filter((e) => e.type === 'save-play').length,
    qbr: events.filter((e) => e.type === 'qbr').length,
    checkIn: events.filter((e) => e.type === 'check-in').length,
  };

  return (
    <div className="bg-white">
      <div className="border-b border-line px-8 pt-[22px]">
        <div className="eyebrow mb-2">Schedule</div>
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">Calendar</h1>
        <p className="mb-4 mt-1 text-[12.5px] text-ink-4">
          Upcoming renewals, QBRs, save plays, and at-risk check-ins — next 90 days.
        </p>
        <div className="-mx-8 flex border-t border-line pl-8">
          <StatCell value={events.length} label="Events" />
          <StatCell value={counts.renewal} label="Renewals" color="#f06a2a" />
          <StatCell value={counts.save} label="Save plays" color="#c4521e" />
          <StatCell value={counts.qbr} label="QBRs" color="#2a9c5e" />
          <StatCell value={counts.checkIn} label="Check-ins" color="#3b82f6" last />
        </div>
      </div>

      {weekEntries.length === 0 ? (
        <div className="px-8 py-10 text-[13px] text-ink-4">No upcoming events in the next 90 days.</div>
      ) : (
        weekEntries.map(({ weekStart, events: weekEvents }) => (
          <section key={weekStart.toISOString()} className="border-b border-line">
            <div className="border-b border-line bg-paper px-8 py-2 text-[10px] font-medium uppercase tracking-eyebrow text-ink-4">
              Week of {fmtWeek(weekStart)}
            </div>
            <ul>
              {weekEvents.map((ev) => {
                const meta = TYPE_META[ev.type];
                const c = ev.customer;
                return (
                  <li key={ev.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center gap-4 px-8 py-[14px] transition-colors hover:bg-paper"
                    >
                      <div className="w-[92px] shrink-0 text-[11.5px] font-medium text-ink-2">
                        {fmtDay(ev.date)}
                      </div>

                      <span
                        className="inline-flex shrink-0 items-center rounded-rect px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.06em]"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-[8px]">
                          <span className="text-[13.5px] font-medium text-ink-1">{c.name}</span>
                          {c.churnRisk && (
                            <span className="text-signal">
                              <ChurnFlag size={10} />
                            </span>
                          )}
                        </div>
                        <div className="mt-[2px] text-[11.5px] text-ink-4">
                          {c.tier} · {fmtEur(c.mrr)}/mo · {c.csm}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div
                          className="num text-[12.5px] font-medium"
                          style={{ color: c.daysToRenewal <= 30 ? '#f06a2a' : '#1f1f1f' }}
                        >
                          {c.daysToRenewal}d to renewal
                        </div>
                        <div className="mt-[2px] text-[10.5px] text-ink-4">{c.health.score} health</div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function StatCell({
  value,
  label,
  color,
  last,
}: {
  value: number;
  label: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <div
      className="py-[14px] pr-7"
      style={{ borderRight: last ? undefined : '1px solid #e5e5e5', marginRight: 28 }}
    >
      <div
        className="display num leading-none"
        style={{ fontSize: 21, fontWeight: 600, color: color ?? '#0a0a0a' }}
      >
        {value}
      </div>
      <div className="mt-[3px] text-[10.5px] text-ink-4">{label}</div>
    </div>
  );
}
