import Link from 'next/link';
import { getActivitiesByAuthor, listCustomers } from '@/lib/customers';
import { SmallHealthBar } from '@/components/HealthBadge';
import { ChurnFlag } from '@/components/ChurnFlag';

export const dynamic = 'force-dynamic';

const ME = {
  name: 'Sam Dijkstra',
  role: 'CSM Lead',
  email: 'sam.dijkstra@planhat.com',
  timezone: 'Europe/Amsterdam',
  initial: 'S',
};

function fmtEur(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `€${n.toLocaleString('en-GB')}`;
}

function fmtDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(',', '');
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(',', '');
}

const ACT_STYLES: Record<string, { color: string; label: string; char: string; bg: string }> = {
  email: { bg: '#e5efff', color: '#3b82f6', label: 'Email', char: '✉' },
  meeting: { bg: '#e1f3e8', color: '#2a9c5e', label: 'Meeting', char: '⟳' },
  system: { bg: '#f4f4f4', color: '#8a8a8a', label: 'System', char: '⚙' },
  call: { bg: '#ede8fb', color: '#7b5ee6', label: 'Call', char: '↗' },
  note: { bg: '#fcecd9', color: '#d97706', label: 'Note', char: '◻' },
};

export default async function ProfilePage() {
  const allCustomers = await listCustomers();
  const owned = allCustomers
    .filter((c) => c.csm === ME.name)
    .sort((a, b) => a.health.score - b.health.score);

  const ownedMrr = owned.reduce((s, c) => s + c.mrr, 0);
  const avgHealth =
    owned.length === 0
      ? 0
      : Math.round(owned.reduce((s, c) => s + c.health.score, 0) / owned.length);
  const atRisk = owned.filter((c) => c.churnRisk).length;

  const recent = await getActivitiesByAuthor(ME.name, 8);

  return (
    <div className="bg-white">
      <div className="border-b border-line px-8 pb-6 pt-[22px]">
        <div className="eyebrow mb-2">Your profile</div>
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[4px] bg-signal text-[22px] font-semibold text-white">
            {ME.initial}
          </div>
          <div className="flex-1">
            <h1 className="display text-[26px] leading-[1.1] text-ink-1">{ME.name}</h1>
            <div className="mt-[2px] text-[12.5px] text-ink-3">{ME.role}</div>
            <div className="mt-[14px] flex flex-wrap">
              <Meta label="Email" value={ME.email} first />
              <Meta label="Timezone" value={ME.timezone} />
              <Meta label="Workspace" value="Planhat Demo" />
            </div>
          </div>
          <button
            type="button"
            className="rounded-rect border border-line bg-white px-3 py-[6px] text-[12px] text-ink-3 transition-colors hover:bg-paper"
          >
            Edit profile
          </button>
        </div>
      </div>

      <section className="border-b border-line px-8 py-6">
        <div className="eyebrow-sm mb-3">Your portfolio</div>
        <div className="-mx-1 grid grid-cols-2 gap-0 md:grid-cols-4">
          <Stat value={String(owned.length)} label="Accounts owned" />
          <Stat value={fmtEur(ownedMrr)} label="Portfolio MRR" />
          <Stat
            value={String(avgHealth)}
            label="Average health"
            color={avgHealth >= 70 ? '#2a9c5e' : avgHealth >= 40 ? '#d97706' : '#f06a2a'}
          />
          <Stat value={String(atRisk)} label="Churn risks" color={atRisk > 0 ? '#f06a2a' : '#0a0a0a'} last />
        </div>
      </section>

      <div className="grid lg:grid-cols-2">
        <section className="border-b border-line px-8 py-6 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="eyebrow-sm">Your accounts</div>
            <Link href="/" className="text-[11.5px] text-ink-3 hover:text-ink-1">
              View all customers ↗
            </Link>
          </div>
          {owned.length === 0 ? (
            <div className="text-[12.5px] text-ink-4">No accounts assigned.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-eyebrow text-ink-4">
                  <th className="py-2 text-left font-medium">Customer</th>
                  <th className="py-2 text-right font-medium">MRR</th>
                  <th className="py-2 text-right font-medium">Renewal</th>
                  <th className="py-2 text-right font-medium">Health</th>
                  <th className="w-7 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {owned.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-[10px]">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-[13px] font-medium text-ink-1 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="num py-[10px] text-right text-[13px] text-ink-2">
                      {fmtEur(c.mrr)}
                    </td>
                    <td className="num py-[10px] text-right text-[12px]">
                      <span style={{ color: c.daysToRenewal <= 60 ? '#d97706' : '#595959' }}>
                        {c.daysToRenewal}d
                      </span>
                    </td>
                    <td className="py-[10px] text-right">
                      <SmallHealthBar score={c.health.score} band={c.health.band} />
                    </td>
                    <td className="w-7 py-[10px] text-center">
                      {c.churnRisk ? (
                        <span className="inline-flex text-signal">
                          <ChurnFlag />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="px-8 py-6">
          <div className="eyebrow-sm mb-4">Your recent activity</div>
          {recent.length === 0 ? (
            <div className="text-[12.5px] text-ink-4">No activity yet.</div>
          ) : (
            <ul className="flex flex-col gap-[14px]">
              {recent.map((a) => {
                const s = ACT_STYLES[a.type] ?? ACT_STYLES.note;
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-[12px] font-bold"
                      style={{ background: s.bg, color: s.color }}
                      aria-hidden
                    >
                      {s.char}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className="text-[11.5px] font-semibold capitalize"
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </span>
                        <Link
                          href={`/customers/${a.customer_id}`}
                          className="text-[12px] font-medium text-ink-1 hover:underline"
                        >
                          {a.customer_name}
                        </Link>
                        <span className="ml-auto text-[11px] text-ink-5">
                          {relativeTime(a.timestamp)}
                        </span>
                      </div>
                      <div className="mt-[2px] text-[12.5px] leading-[1.55] text-ink-3">
                        {a.text}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="border-t border-line px-8 py-6">
        <div className="eyebrow-sm mb-3">Preferences</div>
        <PrefRow label="Email notifications" value="Daily digest" />
        <PrefRow label="Slack notifications" value="On — critical and at-watch only" />
        <PrefRow label="Default landing page" value="Customers" />
        <PrefRow label="Joined" value={fmtDate(new Date('2023-09-01').toISOString())} />
      </section>
    </div>
  );
}

function Meta({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div
      className="px-[22px]"
      style={{
        paddingLeft: first ? 0 : 22,
        borderLeft: first ? 'none' : '1px solid #e5e5e5',
      }}
    >
      <div className="text-[9.5px] font-medium uppercase tracking-eyebrow text-ink-4">{label}</div>
      <div className="mt-[3px] text-[13.5px] font-medium text-ink-1">{value}</div>
    </div>
  );
}

function Stat({
  value,
  label,
  color,
  last,
}: {
  value: string;
  label: string;
  color?: string;
  last?: boolean;
}) {
  return (
    <div
      className="px-1 py-1"
      style={{ borderRight: last ? undefined : '1px solid #e5e5e5' }}
    >
      <div className="eyebrow">{label}</div>
      <div
        className="display num mt-2 leading-none"
        style={{ fontSize: 26, fontWeight: 600, color: color ?? '#0a0a0a' }}
      >
        {value}
      </div>
    </div>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-b-0">
      <span className="text-[12px] text-ink-4">{label}</span>
      <span className="text-[12.5px] font-medium text-ink-1">{value}</span>
    </div>
  );
}
