import Link from 'next/link';
import { listCustomers, getPortfolioHistory } from '@/lib/customers';
import { ChurnFlag } from '@/components/ChurnFlag';
import { SmallHealthBar } from '@/components/HealthBadge';
import { Sparkline } from '@/components/Sparkline';
import type { CustomerWithHealth, PlanTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

function fmtEur(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `€${n.toLocaleString('en-GB')}`;
}

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

export default async function AnalyticsPage() {
  const [customers, portfolioHistory] = await Promise.all([
    listCustomers(),
    getPortfolioHistory(),
  ]);
  const total = customers.length;
  const portfolioMrr = customers.reduce((s, c) => s + c.mrr, 0);
  const atRiskMrr = customers.filter((c) => c.churnRisk).reduce((s, c) => s + c.mrr, 0);
  const avgHealth =
    total === 0 ? 0 : Math.round(customers.reduce((s, c) => s + c.health.score, 0) / total);
  const avgNps =
    total === 0 ? 0 : Math.round(customers.reduce((s, c) => s + c.nps, 0) / total);
  const avgUsage =
    total === 0 ? 0 : Math.round(customers.reduce((s, c) => s + c.usage, 0) / total);

  const greens = customers.filter((c) => c.health.band === 'green').length;
  const ambers = customers.filter((c) => c.health.band === 'amber').length;
  const reds = customers.filter((c) => c.health.band === 'red').length;
  const churnRisks = customers.filter((c) => c.churnRisk).length;

  const tierStats: Record<PlanTier, { count: number; mrr: number }> = {
    Starter: { count: 0, mrr: 0 },
    Pro: { count: 0, mrr: 0 },
    Enterprise: { count: 0, mrr: 0 },
  };
  customers.forEach((c) => {
    tierStats[c.tier].count += 1;
    tierStats[c.tier].mrr += c.mrr;
  });

  const csmGroups = new Map<
    string,
    { accounts: number; avgHealth: number; atRisk: number; mrr: number }
  >();
  customers.forEach((c) => {
    const prev = csmGroups.get(c.csm) ?? { accounts: 0, avgHealth: 0, atRisk: 0, mrr: 0 };
    prev.accounts += 1;
    prev.avgHealth += c.health.score;
    prev.atRisk += c.churnRisk ? 1 : 0;
    prev.mrr += c.mrr;
    csmGroups.set(c.csm, prev);
  });
  const csms = Array.from(csmGroups.entries())
    .map(([name, s]) => ({ ...s, name, avgHealth: Math.round(s.avgHealth / s.accounts) }))
    .sort((a, b) => b.mrr - a.mrr);

  const topRisk = [...customers]
    .filter((c) => c.churnRisk)
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 5);

  return (
    <div className="bg-white">
      <PageHeader
        eyebrow="Portfolio"
        title="Analytics"
        subtitle="Aggregate view of your account portfolio — health distribution, MRR concentration, and team workload."
      />

      <section className="px-8 py-6">
        <div className="grid grid-cols-2 gap-0 md:grid-cols-5">
          <KPI label="Total customers" value={String(total)} sub={`Across ${csms.length} CSMs`} />
          <KPI label="Portfolio MRR" value={fmtEur(portfolioMrr)} sub={`${fmtEur(portfolioMrr * 12)} ARR`} />
          <KPI label="At-risk MRR" value={fmtEur(atRiskMrr)} sub={`${churnRisks} accounts ↗`} color="#f06a2a" href="/?risk=1" />
          <KPI label="Average health" value={String(avgHealth)} sub={avgHealth >= 70 ? 'Healthy band' : avgHealth >= 40 ? 'At-watch band' : 'Critical band'} />
          <KPI label="Average NPS" value={`${avgNps >= 0 ? '+' : ''}${avgNps}`} sub={`Usage ${avgUsage}% avg`} last />
        </div>
      </section>

      <section className="border-t border-line px-8 py-6">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="eyebrow-sm">Health distribution</div>
          <span className="text-[11px] text-ink-4">Click a band to drill in ↓</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded border border-line">
          <Link href="/?health=green" style={{ width: `${pct(greens, total)}%`, background: '#2a9c5e' }} className="transition-opacity hover:opacity-80" />
          <Link href="/?health=amber" style={{ width: `${pct(ambers, total)}%`, background: '#d97706' }} className="transition-opacity hover:opacity-80" />
          <Link href="/?health=red" style={{ width: `${pct(reds, total)}%`, background: '#f06a2a' }} className="transition-opacity hover:opacity-80" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-6">
          <Legend href="/?health=green" dot="#2a9c5e" label="Healthy" count={greens} share={pct(greens, total)} />
          <Legend href="/?health=amber" dot="#d97706" label="At watch" count={ambers} share={pct(ambers, total)} />
          <Legend href="/?health=red" dot="#f06a2a" label="Critical" count={reds} share={pct(reds, total)} />
        </div>
      </section>

      {portfolioHistory.length >= 2 && (
        <section className="border-t border-line px-8 py-6">
          <div className="mb-1 flex items-baseline justify-between">
            <div className="eyebrow-sm">Portfolio health over time</div>
            <span className="num text-[11.5px] text-ink-4">
              Avg health{' '}
              {(() => {
                const d =
                  portfolioHistory[portfolioHistory.length - 1].avgHealth -
                  portfolioHistory[0].avgHealth;
                return (
                  <span style={{ color: d >= 0 ? '#2a9c5e' : '#f06a2a' }}>
                    {d >= 0 ? '+' : ''}
                    {d} over {portfolioHistory.length} weeks
                  </span>
                );
              })()}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-6">
            <Sparkline
              values={portfolioHistory.map((h) => h.avgHealth)}
              width={420}
              height={64}
              color="#f06a2a"
              strokeWidth={2}
            />
            <div className="flex flex-col gap-1">
              <div className="num text-[24px] font-semibold text-ink-1">
                {portfolioHistory[portfolioHistory.length - 1].avgHealth}
              </div>
              <div className="text-[11px] text-ink-4">current avg health</div>
            </div>
          </div>
        </section>
      )}

      <div className="grid border-t border-line lg:grid-cols-2">
        <section className="border-b border-line px-8 py-6 lg:border-b-0 lg:border-r">
          <div className="eyebrow-sm mb-4">MRR by tier</div>
          <div className="flex flex-col gap-3">
            {(Object.keys(tierStats) as PlanTier[]).map((tier) => {
              const t = tierStats[tier];
              return (
                <div key={tier} className="grid items-center gap-3" style={{ gridTemplateColumns: '110px 1fr 90px' }}>
                  <div className="text-[12.5px] font-medium text-ink-1">{tier}</div>
                  <div className="h-[6px] overflow-hidden rounded-[2px] bg-line">
                    <div
                      className="h-full rounded-[2px] bg-ink-1"
                      style={{ width: `${pct(t.mrr, portfolioMrr)}%` }}
                    />
                  </div>
                  <div className="num text-right text-[12.5px] text-ink-2">
                    {fmtEur(t.mrr)} <span className="text-ink-4">· {t.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-8 py-6">
          <div className="eyebrow-sm mb-4">CSM workload</div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-eyebrow text-ink-4">
                <th className="py-2 text-left font-medium">CSM</th>
                <th className="py-2 text-right font-medium">Accounts</th>
                <th className="py-2 text-right font-medium">Portfolio MRR</th>
                <th className="py-2 text-right font-medium">Avg health</th>
                <th className="py-2 text-right font-medium">At risk</th>
              </tr>
            </thead>
            <tbody>
              {csms.map((c) => (
                <tr key={c.name} className="border-t border-line">
                  <td className="py-[10px] text-[13px] text-ink-1">{c.name}</td>
                  <td className="num py-[10px] text-right text-[12.5px] text-ink-2">{c.accounts}</td>
                  <td className="num py-[10px] text-right text-[12.5px] text-ink-2">{fmtEur(c.mrr)}</td>
                  <td className="py-[10px] text-right">
                    <SmallHealthBar
                      score={c.avgHealth}
                      band={c.avgHealth >= 70 ? 'green' : c.avgHealth >= 40 ? 'amber' : 'red'}
                    />
                  </td>
                  <td className="num py-[10px] text-right text-[12.5px]">
                    <span style={{ color: c.atRisk > 0 ? '#f06a2a' : '#8a8a8a' }}>{c.atRisk}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="border-t border-line px-8 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="eyebrow-sm">Top accounts at risk</div>
          <Link href="/" className="text-[11.5px] text-ink-3 hover:text-ink-1">
            View all customers ↗
          </Link>
        </div>
        {topRisk.length === 0 ? (
          <div className="text-[12.5px] text-ink-4">No accounts currently at risk.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-eyebrow text-ink-4">
                <th className="py-2 text-left font-medium">Customer</th>
                <th className="py-2 text-left font-medium">CSM</th>
                <th className="py-2 text-right font-medium">MRR</th>
                <th className="py-2 text-right font-medium">Renewal</th>
                <th className="py-2 text-right font-medium">Health</th>
                <th className="w-7 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {topRisk.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="py-[10px]">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-[13px] font-medium text-ink-1 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-[10px] text-[12.5px] text-ink-3">{c.csm}</td>
                  <td className="num py-[10px] text-right text-[13px] text-ink-2">{fmtEur(c.mrr)}</td>
                  <td className="num py-[10px] text-right text-[12.5px] text-amber">
                    {c.daysToRenewal}d
                  </td>
                  <td className="py-[10px] text-right">
                    <SmallHealthBar score={c.health.score} band={c.health.band} />
                  </td>
                  <td className="w-7 py-[10px] text-center">
                    <span className="inline-flex text-signal">
                      <ChurnFlag />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border-b border-line px-8 pb-5 pt-[22px]">
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h1 className="display text-[22px] leading-[1.1] text-ink-1">{title}</h1>
      <p className="mt-1 text-[12.5px] text-ink-4">{subtitle}</p>
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  color,
  last,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
  last?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <div className="eyebrow">{label}</div>
      <div
        className="display num mt-2 leading-none"
        style={{ fontSize: 26, fontWeight: 600, color: color ?? '#0a0a0a' }}
      >
        {value}
      </div>
      <div className="mt-1 text-[11.5px] text-ink-4">{sub}</div>
    </>
  );
  const style = { borderRight: last ? undefined : '1px solid #e5e5e5' } as const;
  if (href) {
    return (
      <Link href={href} className="py-2 pr-7 transition-opacity hover:opacity-70" style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div className="py-2 pr-7" style={style}>
      {inner}
    </div>
  );
}

function Legend({
  dot,
  label,
  count,
  share,
  href,
}: {
  dot: string;
  label: string;
  count: number;
  share: number;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span className="h-[8px] w-[8px] rounded-full" style={{ background: dot }} />
        <span className="eyebrow" style={{ color: dot }}>
          {label}
        </span>
      </div>
      <div className="num mt-1 text-[18px] font-medium text-ink-1">
        {count} <span className="text-[11.5px] font-normal text-ink-4">· {share}%</span>
      </div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="block rounded transition-opacity hover:opacity-70">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}
