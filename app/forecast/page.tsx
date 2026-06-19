import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { listCustomers } from '@/lib/customers';
import { computeForecast, FORECAST_HORIZON_DAYS, type ForecastAccount } from '@/lib/forecast';
import { ChurnFlag } from '@/components/ChurnFlag';

export const dynamic = 'force-dynamic';

function fmtEur(n: number) {
  const v = Math.round(n);
  if (Math.abs(v) >= 1000) return `€${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k`;
  return `€${v.toLocaleString('en-GB')}`;
}
function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const token = cookies().get('ph_session')?.value;
  const sessionUser = token ? verifySessionToken(token) : null;
  if (!sessionUser) redirect('/login');

  const scope: 'mine' | 'all' = searchParams.scope === 'all' ? 'all' : 'mine';
  const customers = await listCustomers();
  const f = computeForecast(customers, scope, sessionUser.name);

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-line px-8 pb-5 pt-[22px]">
        <div className="eyebrow mb-2">Revenue</div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-[22px] leading-[1.1] text-ink-1">Forecast</h1>
            <p className="mt-1 text-[12.5px] text-ink-4">
              Renewals in the next {FORECAST_HORIZON_DAYS} days, weighted by renewal likelihood
              derived from health. {f.renewingCount} account{f.renewingCount !== 1 ? 's' : ''} in
              the window.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-rect border border-line p-[2px]">
            <ScopeTab label="My portfolio" active={scope === 'mine'} href="/forecast?scope=mine" />
            <ScopeTab label="Whole team" active={scope === 'all'} href="/forecast?scope=all" />
          </div>
        </div>
      </div>

      {/* Attainment cards */}
      <section className="grid gap-0 border-b border-line sm:grid-cols-3">
        <AttainmentCard
          metric="GRR"
          full="Gross revenue retention"
          forecast={fmtPct(f.grrForecast)}
          target={fmtPct(f.target.grr)}
          gap={f.grrGap}
          gapText={`${f.grrGap >= 0 ? '+' : ''}${Math.round(f.grrGap * 100)}pts vs target`}
          definition="Share of renewing ARR you keep, before expansion. Caps at 100%."
        />
        <AttainmentCard
          metric="NRR"
          full="Net revenue retention"
          forecast={fmtPct(f.nrrForecast)}
          target={fmtPct(f.target.nrr)}
          gap={f.nrrGap}
          gapText={`${f.nrrGap >= 0 ? '+' : ''}${Math.round(f.nrrGap * 100)}pts vs target`}
          definition="Retained ARR plus expansion, over the renewing base. Above 100% = net growth."
        />
        <AttainmentCard
          metric="New ACV"
          full="Expansion / new annual revenue"
          forecast={fmtEur(f.newAcvForecast)}
          target={fmtEur(f.target.newAcv)}
          gap={f.newAcvGap}
          gapText={`${f.newAcvGap >= 0 ? '+' : ''}${fmtEur(f.newAcvGap)} vs target`}
          definition="Probability-weighted expansion ARR from high-usage healthy accounts."
          last
        />
      </section>

      {/* Forecast bands */}
      <section className="border-b border-line px-8 py-6">
        <div className="eyebrow-sm mb-4">Renewal forecast — ARR at stake</div>
        <ForecastBands
          base={f.renewalBaseArr}
          worst={f.worstCaseArr}
          committed={f.committedArr}
          best={f.bestCaseArr}
        />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <BandStat label="Renewal base" value={fmtEur(f.renewalBaseArr)} sub="total ARR up for renewal" />
          <BandStat label="Worst case" value={fmtEur(f.worstCaseArr)} sub="likelihood −20%" color="#f06a2a" />
          <BandStat label="Committed" value={fmtEur(f.committedArr)} sub="expected retained" color="#0a0a0a" />
          <BandStat label="Best case" value={fmtEur(f.bestCaseArr)} sub="likelihood +20%" color="#2a9c5e" />
        </div>
      </section>

      <div className="grid lg:grid-cols-2">
        {/* Swing cases */}
        <section className="border-b border-line px-8 py-6 lg:border-b-0 lg:border-r">
          <div className="eyebrow-sm mb-1">Swing cases</div>
          <p className="mb-4 text-[12px] text-ink-4">
            Accounts that move the number most — ranked by the ARR spread between best and worst case.
          </p>
          {f.swingCases.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">No renewals in the forecast window.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {f.swingCases.map((a) => (
                <SwingRow key={a.customer.id} a={a} />
              ))}
            </ul>
          )}
        </section>

        {/* Where I can make impact */}
        <section className="px-8 py-6">
          <div className="eyebrow-sm mb-1">Where you can still make impact</div>
          <p className="mb-4 text-[12px] text-ink-4">
            Actionable accounts ranked by recoverable ARR — what a successful intervention wins back.
          </p>
          {f.impactCases.length === 0 ? (
            <p className="text-[12.5px] text-ink-4">No actionable levers in the forecast window.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {f.impactCases.map((a) => (
                <ImpactRow key={a.customer.id} a={a} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ScopeTab({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={[
        'rounded-[3px] px-3 py-[5px] text-[12px] font-medium transition-colors',
        active ? 'bg-ink-1 text-white' : 'text-ink-3 hover:text-ink-1',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

function AttainmentCard({
  metric,
  full,
  forecast,
  target,
  gap,
  gapText,
  definition,
  last,
}: {
  metric: string;
  full: string;
  forecast: string;
  target: string;
  gap: number;
  gapText: string;
  definition: string;
  last?: boolean;
}) {
  const onTrack = gap >= 0;
  return (
    <div className="px-8 py-5" style={{ borderRight: last ? undefined : '1px solid #e5e5e5' }}>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink-1">{metric}</span>
        <span
          className="inline-flex items-center gap-[5px] rounded-rect px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.06em]"
          style={
            onTrack
              ? { background: '#e1f3e8', color: '#2a9c5e' }
              : { background: '#fde8dd', color: '#f06a2a' }
          }
        >
          {onTrack ? 'On track' : 'Below target'}
        </span>
      </div>
      <div className="mt-[2px] text-[11px] text-ink-4">{full}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="display num leading-none"
          style={{ fontSize: 28, fontWeight: 600, color: onTrack ? '#0a0a0a' : '#f06a2a' }}
        >
          {forecast}
        </span>
        <span className="text-[12px] text-ink-4">/ {target} target</span>
      </div>
      <div
        className="num mt-1 text-[11.5px] font-medium"
        style={{ color: onTrack ? '#2a9c5e' : '#f06a2a' }}
      >
        {gapText}
      </div>
      <p className="mt-3 border-t border-line pt-2 text-[11px] leading-[1.5] text-ink-4">
        {definition}
      </p>
    </div>
  );
}

function ForecastBands({
  base,
  worst,
  committed,
  best,
}: {
  base: number;
  worst: number;
  committed: number;
  best: number;
}) {
  const safe = base || 1;
  const worstPct = (worst / safe) * 100;
  const committedPct = (committed / safe) * 100;
  const bestPct = (best / safe) * 100;
  return (
    <div>
      <div className="relative h-7 overflow-hidden rounded border border-line bg-paper">
        {/* best case (lightest) */}
        <div className="absolute inset-y-0 left-0 bg-[#e1f3e8]" style={{ width: `${bestPct}%` }} />
        {/* committed (mid) */}
        <div className="absolute inset-y-0 left-0 bg-[#cfe9d9]" style={{ width: `${committedPct}%` }} />
        {/* worst case (solid) */}
        <div className="absolute inset-y-0 left-0 bg-[#2a9c5e]/70" style={{ width: `${worstPct}%` }} />
        {/* committed marker */}
        <div className="absolute inset-y-0 w-[2px] bg-ink-1" style={{ left: `${committedPct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10.5px] text-ink-4">
        <span>€0</span>
        <span>Committed marker = expected retained ARR</span>
        <span>{fmtEur(base)}</span>
      </div>
    </div>
  );
}

function BandStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="num mt-1 text-[18px] font-semibold" style={{ color: color ?? '#0a0a0a' }}>
        {value}
      </div>
      <div className="text-[10.5px] text-ink-4">{sub}</div>
    </div>
  );
}

function SwingRow({ a }: { a: ForecastAccount }) {
  const c = a.customer;
  return (
    <li className="py-3 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/customers/${c.id}`}
            className="flex items-center gap-2 text-[13px] font-medium text-ink-1 hover:underline"
          >
            {c.name}
            {c.churnRisk && (
              <span className="text-signal">
                <ChurnFlag size={9} />
              </span>
            )}
          </Link>
          <div className="mt-[2px] text-[11px] text-ink-4">
            {fmtEur(a.arr)} ARR · {c.daysToRenewal}d · {Math.round(a.likelihood * 100)}% likely ·
            health {c.health.score}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-[13px] font-semibold text-ink-1">±{fmtEur(a.swing / 2)}</div>
          <div className="text-[10px] text-ink-4">swing</div>
        </div>
      </div>
    </li>
  );
}

function ImpactRow({ a }: { a: ForecastAccount }) {
  const c = a.customer;
  return (
    <li className="rounded border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/customers/${c.id}`}
          className="text-[13px] font-semibold text-ink-1 hover:underline"
        >
          {c.name}
        </Link>
        <div className="shrink-0 text-right">
          <div className="num text-[13px] font-semibold text-signal">{fmtEur(a.recoverableArr)}</div>
          <div className="text-[10px] text-ink-4">recoverable</div>
        </div>
      </div>
      <div className="mt-1 text-[11.5px] text-ink-4">
        {fmtEur(a.arr)} ARR at {Math.round(a.likelihood * 100)}% likelihood
      </div>
      {a.playbookSlug ? (
        <Link
          href={`/playbooks/${a.playbookSlug}`}
          className="mt-2 inline-block text-[11.5px] font-medium text-signal hover:underline"
        >
          {a.leverLabel} ↗
        </Link>
      ) : (
        <span className="mt-2 inline-block text-[11.5px] text-ink-4">{a.leverLabel}</span>
      )}
    </li>
  );
}
