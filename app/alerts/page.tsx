import Link from 'next/link';
import { listCustomers } from '@/lib/customers';
import { ChurnFlag } from '@/components/ChurnFlag';

export const dynamic = 'force-dynamic';

interface AlertItem {
  id: string;
  timestamp: Date;
  customer_id: string;
  customer_name: string;
  customer_tier: string;
  severity: 'critical' | 'watch' | 'info';
  channel: 'Slack' | 'In-app' | 'Email';
  message: string;
  delivered: boolean;
}

function severityStyle(s: AlertItem['severity']) {
  if (s === 'critical') return { bg: '#fde8dd', color: '#c4521e', label: 'Critical' };
  if (s === 'watch') return { bg: '#fcecd9', color: '#d97706', label: 'At watch' };
  return { bg: '#f4f4f4', color: '#595959', label: 'Info' };
}

function timeAgo(d: Date) {
  const ms = Date.now() - d.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(',', '');
}

function bucketLabel(d: Date) {
  const ms = Date.now() - d.getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return 'Today';
  if (hours < 48) return 'Yesterday';
  if (hours < 24 * 7) return 'This week';
  return 'Earlier';
}

export default async function AlertsPage() {
  const customers = await listCustomers();

  const alerts: AlertItem[] = [];

  customers.forEach((c) => {
    if (c.health.band === 'red') {
      const t = c.alerted_at ? new Date(c.alerted_at) : new Date(Date.now() - 6 * 60 * 60 * 1000);
      alerts.push({
        id: `${c.id}_critical`,
        timestamp: t,
        customer_id: c.id,
        customer_name: c.name,
        customer_tier: c.tier,
        severity: 'critical',
        channel: 'Slack',
        message: `Health score dropped to ${c.health.score} — entered critical band.`,
        delivered: Boolean(c.alerted_at),
      });
    }
    if (c.churnRisk && c.health.band !== 'red' && c.daysToRenewal <= 60) {
      alerts.push({
        id: `${c.id}_renewal`,
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000 - c.id.length * 36e5),
        customer_id: c.id,
        customer_name: c.name,
        customer_tier: c.tier,
        severity: 'watch',
        channel: 'Slack',
        message: `Renewal in ${c.daysToRenewal} days with health below 60 — save play recommended.`,
        delivered: true,
      });
    }
    if (c.open_tickets >= 6) {
      alerts.push({
        id: `${c.id}_tickets`,
        timestamp: new Date(Date.now() - (24 + c.open_tickets) * 60 * 60 * 1000),
        customer_id: c.id,
        customer_name: c.name,
        customer_tier: c.tier,
        severity: 'watch',
        channel: 'In-app',
        message: `Open tickets crossed plan threshold (${c.open_tickets}).`,
        delivered: true,
      });
    }
    if (c.nps <= -50) {
      alerts.push({
        id: `${c.id}_nps`,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        customer_id: c.id,
        customer_name: c.name,
        customer_tier: c.tier,
        severity: 'info',
        channel: 'Email',
        message: `NPS detractor (${c.nps}) — follow-up sequence queued.`,
        delivered: true,
      });
    }
  });

  alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const grouped = new Map<string, AlertItem[]>();
  alerts.forEach((a) => {
    const k = bucketLabel(a.timestamp);
    const arr = grouped.get(k) ?? [];
    arr.push(a);
    grouped.set(k, arr);
  });

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const watch = alerts.filter((a) => a.severity === 'watch').length;

  return (
    <div className="bg-white">
      <div className="border-b border-line px-8 pt-[22px]">
        <div className="eyebrow mb-2">Notifications</div>
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">Alerts</h1>
        <p className="mb-4 mt-1 text-[12.5px] text-ink-4">
          System-fired alerts triggered by health, renewal, and engagement signals across your portfolio.
        </p>
        <div className="-mx-8 flex border-t border-line pl-8">
          <Stat value={alerts.length} label="Total" />
          <Stat value={critical} label="Critical" color="#c4521e" />
          <Stat value={watch} label="At watch" color="#d97706" />
          <Stat
            value={alerts.filter((a) => !a.delivered).length}
            label="Pending"
            color="#0a0a0a"
            last
          />
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="px-8 py-10 text-[13px] text-ink-4">No alerts firing right now.</div>
      ) : (
        Array.from(grouped.entries()).map(([bucket, items]) => (
          <section key={bucket} className="border-b border-line">
            <div className="border-b border-line bg-paper px-8 py-2 text-[10px] font-medium uppercase tracking-eyebrow text-ink-4">
              {bucket}
            </div>
            <ul>
              {items.map((a) => {
                const sev = severityStyle(a.severity);
                return (
                  <li key={a.id} className="border-b border-line last:border-b-0">
                    <Link
                      href={`/customers/${a.customer_id}`}
                      className="flex items-start gap-4 px-8 py-4 transition-colors hover:bg-paper"
                    >
                      <span
                        className="inline-flex shrink-0 items-center rounded-rect px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.06em]"
                        style={{ background: sev.bg, color: sev.color }}
                      >
                        {sev.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-[13.5px] font-medium text-ink-1">
                            {a.customer_name}
                          </span>
                          <span className="text-[11px] text-ink-4">· {a.customer_tier}</span>
                          {a.severity === 'critical' && (
                            <span className="text-signal">
                              <ChurnFlag size={10} />
                            </span>
                          )}
                        </div>
                        <div className="mt-[3px] text-[12.5px] leading-[1.55] text-ink-3">
                          {a.message}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] text-ink-3">{a.channel}</div>
                        <div className="text-[10.5px] text-ink-5">{timeAgo(a.timestamp)}</div>
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

function Stat({
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
