import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getActivities,
  getContacts,
  getCustomer,
  getMetricHistory,
  getChildren,
  getComments,
} from '@/lib/customers';
import { HealthRing, bandColor } from '@/components/HealthBadge';
import { ChurnFlag } from '@/components/ChurnFlag';
import ActivityTimeline from '@/components/ActivityTimeline';
import LogTouchpointForm from '@/components/LogTouchpointForm';
import SlackAlertButton from '@/components/SlackAlertButton';
import { W_NPS, W_TICKETS, W_USAGE, TICKET_SATURATION, clamp } from '@/lib/health';
import { getHealthSuggestions } from '@/lib/suggestions';
import { explainHealth } from '@/lib/healthSignals';
import { assessStakeholders, SENTIMENT_META, INFLUENCE_META } from '@/lib/stakeholders';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { Sparkline } from '@/components/Sparkline';
import { CommentThread } from '@/components/CommentThread';
import type { Contact } from '@/lib/types';

export const dynamic = 'force-dynamic';

function fmtCurrency(n: number) {
  return `€${n.toLocaleString('en-GB')}`;
}

function fmtDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(',', '');
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ init, size = 32 }: { init: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[3px] bg-surface font-semibold text-ink-3"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        letterSpacing: '-0.01em',
      }}
    >
      {init}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const s =
    tier === 'Enterprise'
      ? 'bg-ink-1 text-white'
      : tier === 'Pro'
      ? 'bg-surface text-ink-3'
      : 'bg-paper text-ink-4 border border-line';
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-rect px-[7px] py-[2px] text-[10px] font-medium tracking-[0.05em] ${s}`}
    >
      {tier}
    </span>
  );
}

function HBarRow({
  label,
  pct,
  score,
  max,
}: {
  label: string;
  pct: number;
  score: number;
  max: number;
}) {
  const fg = pct >= 75 ? '#2a9c5e' : pct >= 50 ? '#d97706' : '#f06a2a';
  return (
    <div
      className="grid items-center gap-3"
      style={{ gridTemplateColumns: '108px 1fr 44px 60px' }}
    >
      <span className="text-[12.5px] text-ink-3">{label}</span>
      <div className="h-[4px] overflow-hidden rounded-[2px] bg-line">
        <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, background: fg }} />
      </div>
      <span className="text-right text-[11.5px] text-ink-4">{Math.round(pct)}%</span>
      <span className="num text-right text-[12px] font-medium text-ink-2">
        +{score.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function MetaCell({
  label,
  value,
  first,
}: {
  label: string;
  value: React.ReactNode;
  first?: boolean;
}) {
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

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const c = await getCustomer(params.id);
  if (!c) notFound();

  const [contacts, activities, history, children, comments, parent] = await Promise.all([
    getContacts(c.id),
    getActivities(c.id),
    getMetricHistory(c.id),
    getChildren(c.id),
    getComments(c.id),
    c.parent_id ? getCustomer(c.parent_id) : Promise.resolve(null),
  ]);

  const explanation = explainHealth(c, history);
  const stakeholderHealth = assessStakeholders(contacts);
  const healthSeries = history.map((h) => h.health);

  // Derive the same axis percentages the health function used, for display.
  const usagePct = clamp(c.usage, 0, 100);
  const ticketsPct = clamp(100 - (c.open_tickets / TICKET_SATURATION) * 100, 0, 100);
  const npsPct = clamp(((c.nps + 100) / 200) * 100, 0, 100);

  const bc = bandColor(c.health.band);
  const showAlert = c.health.band === 'red' || c.churnRisk;

  return (
    <div className="min-h-full bg-white">
      <div className="flex items-center border-b border-line px-8 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-[5px] rounded-[3px] border border-line bg-white px-[10px] py-[5px] text-[12px] text-ink-3 transition-colors duration-100 hover:bg-paper"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 2.5L4.5 7 9 11.5" />
          </svg>
          Customers
        </Link>
      </div>

      <div className="border-b border-line px-8 pb-[22px] pt-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar init={initials(c.name)} size={48} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-[10px]">
              <h1 className="display text-[26px] leading-[1.1] text-ink-1">{c.name}</h1>
              <TierBadge tier={c.tier} />
              {c.churnRisk && (
                <span className="inline-flex items-center gap-[5px] rounded-rect bg-signal-soft px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.08em] text-signal-deep">
                  <ChurnFlag size={10} />
                  Churn risk
                </span>
              )}
            </div>
            <div className="mt-[14px] flex flex-wrap">
              <MetaCell label="MRR" value={fmtCurrency(c.mrr)} first />
              <MetaCell
                label="Renewal"
                value={
                  <span>
                    {fmtDate(c.renewal_date)}{' '}
                    <span className="text-ink-4">· {c.daysToRenewal}d</span>
                  </span>
                }
              />
              <MetaCell label="CSM" value={c.csm} />
              <MetaCell label="Customer since" value={fmtDate(c.created_at)} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <HealthRing score={c.health.score} band={c.health.band} size={82} />
            {showAlert && <SlackAlertButton customerId={c.id} />}
          </div>
        </div>

        {c.churnRisk && (
          <div
            className="mt-5 flex items-start gap-3 rounded p-3 text-[12.5px] leading-[1.55]"
            style={{ background: bc.bg, color: bc.fg, borderLeft: `2px solid ${bc.fg}` }}
          >
            <span className="mt-[2px] shrink-0">
              <ChurnFlag size={12} />
            </span>
            <div>
              <div className="text-[12.5px] font-semibold">Churn risk detected</div>
              <div className="opacity-90">
                {c.health.band === 'red'
                  ? `Health score ${c.health.score} sits in the critical band.`
                  : `Renewal is in ${c.daysToRenewal} days and health is below 60.`}{' '}
                Consider a save-play and escalating internally.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="flex flex-col gap-7 border-r border-line px-8 py-6">
          <section>
            <div className="mb-[10px] flex items-center justify-between">
              <div className="eyebrow-sm">Health breakdown</div>
              {healthSeries.length >= 2 && (
                <span className="inline-flex items-center gap-2">
                  <Sparkline values={healthSeries} color={bc.fg} width={84} height={24} />
                  {explanation.trend && (
                    <span
                      className="num text-[11.5px] font-medium"
                      style={{
                        color:
                          explanation.trend.deltaHealth > 0
                            ? '#2a9c5e'
                            : explanation.trend.deltaHealth < 0
                            ? '#f06a2a'
                            : '#8a8a8a',
                      }}
                    >
                      {explanation.trend.deltaHealth > 0 ? '+' : ''}
                      {explanation.trend.deltaHealth}
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Why this score */}
            <div
              className="mb-[14px] rounded border-l-2 p-3 text-[12px] leading-[1.55]"
              style={{ background: bc.bg, borderColor: bc.fg, color: '#3a3a3a' }}
            >
              <span className="font-medium text-ink-1">Why: </span>
              {explanation.summary}
              {explanation.trend && (
                <span className="text-ink-3"> {explanation.trend.note}</span>
              )}
            </div>

            <div className="mb-[14px] text-[11.5px] leading-[1.6] text-ink-4">
              Weighted blend — usage ({Math.round(W_USAGE * 100)}%), support load (
              {Math.round(W_TICKETS * 100)}%), NPS ({Math.round(W_NPS * 100)}%)
            </div>
            <div className="flex flex-col gap-[10px]">
              <HBarRow
                label="Usage"
                pct={usagePct}
                score={c.health.usageComponent}
                max={Math.round(W_USAGE * 100)}
              />
              <HBarRow
                label="Support load"
                pct={ticketsPct}
                score={c.health.ticketsComponent}
                max={Math.round(W_TICKETS * 100)}
              />
              <HBarRow
                label="NPS"
                pct={npsPct}
                score={c.health.npsComponent}
                max={Math.round(W_NPS * 100)}
              />
            </div>

            {/* Per-axis signals — the data behind each axis */}
            <ul className="mt-4 flex flex-col gap-2">
              {explanation.drivers.map((d) => (
                <li key={d.axis} className="flex items-start gap-2 text-[12px] leading-[1.5]">
                  <span
                    className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{
                      background:
                        d.tone === 'positive'
                          ? '#2a9c5e'
                          : d.tone === 'neutral'
                          ? '#d97706'
                          : '#f06a2a',
                    }}
                  />
                  <span className="text-ink-3">
                    <span className="font-medium text-ink-2">{d.axis}:</span> {d.signal}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {history.length >= 2 && (
            <section>
              <div className="eyebrow-sm mb-3">History — last {history.length} weeks</div>
              <TimeSeriesChart history={history} />
            </section>
          )}

          <section>
            <div className="eyebrow-sm mb-3">Relationship map</div>
            <StakeholderMap contacts={contacts} assessment={stakeholderHealth} />
          </section>

          <section>
            <div className="eyebrow-sm mb-3">What to do this week</div>
            <SuggestionList customer={c} />
          </section>

          <section>
            <div className="eyebrow-sm mb-3">Discussion</div>
            <CommentThread customerId={c.id} initialComments={comments} />
          </section>

          <section>
            <div className="eyebrow-sm mb-[14px]">Activity timeline</div>
            <ActivityTimeline activities={activities} />

            <div className="mt-[22px]">
              <LogTouchpointForm customerId={c.id} defaultAuthor={c.csm} />
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6 px-[22px] py-6">
          {(parent || children.length > 0) && (
            <section>
              <div className="eyebrow-sm mb-3">Account family</div>
              <AccountFamily current={c} parent={parent} children={children} />
            </section>
          )}

          <section>
            <div className="eyebrow-sm mb-3">Quick facts</div>
            <Row k="Plan tier" v={c.tier} />
            <Row k="MRR" v={fmtCurrency(c.mrr)} />
            <Row k="ARR (approx)" v={fmtCurrency(c.mrr * 12)} />
            <Row k="Active usage" v={`${Math.round(c.usage)}%`} />
            <Row k="Open tickets" v={String(c.open_tickets)} />
            <Row
              k="NPS"
              v={`${c.nps >= 0 ? '+' : ''}${c.nps}`}
              valueColor={c.nps >= 0 ? '#2a9c5e' : '#f06a2a'}
            />
            <Row
              k="Last alerted"
              v={c.alerted_at ? fmtDate(c.alerted_at) : '—'}
            />
          </section>

          {contacts.length > 0 && (
            <section>
              <div className="eyebrow-sm mb-3">Key contacts</div>
              <div className="flex flex-col gap-3">
                {contacts.map((co) => (
                  <div key={co.id} className="flex items-center gap-[10px]">
                    <Avatar init={initials(co.name)} size={32} />
                    <div>
                      <div className="text-[13px] font-medium leading-[1.3] text-ink-1">{co.name}</div>
                      <div className="text-[11px] text-ink-4">{co.role}</div>
                      <a
                        href={`mailto:${co.email}`}
                        className="mt-[1px] block text-[11px] text-blue hover:underline"
                      >
                        {co.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function SuggestionList({ customer }: { customer: import('@/lib/types').CustomerWithHealth }) {
  const suggestions = getHealthSuggestions(customer);
  if (suggestions.length === 0) {
    return <p className="text-[12.5px] text-ink-4">No actions recommended at this time.</p>;
  }
  const DOT: Record<import('@/lib/suggestions').SuggestionPriority, string> = {
    critical: '#f06a2a',
    warning: '#d97706',
    positive: '#2a9c5e',
  };
  return (
    <ul className="flex flex-col gap-3">
      {suggestions.map((s, i) => (
        <li key={i} className="flex items-start gap-3 rounded border border-line p-3">
          <span
            className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
            style={{ background: DOT[s.priority] }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium leading-[1.4] text-ink-1">{s.action}</div>
            <div className="mt-[4px] text-[12px] leading-[1.55] text-ink-4">{s.detail}</div>
            {s.playbookSlug && (
              <Link
                href={`/playbooks/${s.playbookSlug}`}
                className="mt-2 inline-block text-[11.5px] font-medium text-signal hover:underline"
              >
                {s.playbookLabel} ↗
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StakeholderMap({
  contacts,
  assessment,
}: {
  contacts: Contact[];
  assessment: import('@/lib/stakeholders').StakeholderHealth;
}) {
  if (contacts.length === 0) {
    return <p className="text-[12.5px] text-ink-4">No stakeholders mapped.</p>;
  }
  // Order by influence then sentiment rank (best first)
  const order = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...contacts].sort((a, b) => {
    if (order[a.influence] !== order[b.influence]) return order[a.influence] - order[b.influence];
    return SENTIMENT_META[b.sentiment].rank - SENTIMENT_META[a.sentiment].rank;
  });

  return (
    <div>
      <div
        className="mb-3 flex items-start gap-2 rounded border-l-2 p-3 text-[12px] leading-[1.5]"
        style={
          assessment.riskNote
            ? { background: '#fde8dd', borderColor: '#f06a2a', color: '#3a3a3a' }
            : { background: '#e1f3e8', borderColor: '#2a9c5e', color: '#3a3a3a' }
        }
      >
        <span>
          <span className="font-medium text-ink-1">{assessment.coverageNote}</span>
          {assessment.riskNote && <span className="text-ink-3"> {assessment.riskNote}</span>}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-line rounded border border-line">
        {sorted.map((co) => {
          const sm = SENTIMENT_META[co.sentiment];
          return (
            <li key={co.id} className="flex items-start gap-3 px-3 py-[10px]">
              <Avatar init={initials(co.name)} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-medium text-ink-1">{co.name}</span>
                  <span className="text-[11px] text-ink-4">{co.role}</span>
                </div>
                <div className="mt-[3px] flex flex-wrap items-center gap-[6px]">
                  <span
                    className="inline-flex items-center rounded-rect px-[6px] py-[1px] text-[10px] font-medium"
                    style={{ background: sm.bg, color: sm.color }}
                  >
                    {sm.label}
                  </span>
                  <span className="inline-flex items-center rounded-rect border border-line px-[6px] py-[1px] text-[10px] text-ink-4">
                    {INFLUENCE_META[co.influence].label}
                  </span>
                </div>
                {co.notes && (
                  <div className="mt-[4px] text-[11.5px] leading-[1.45] text-ink-4">{co.notes}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AccountFamily({
  current,
  parent,
  children,
}: {
  current: import('@/lib/types').CustomerWithHealth;
  parent: import('@/lib/types').CustomerWithHealth | null;
  children: import('@/lib/types').CustomerWithHealth[];
}) {
  const family = [parent, current, ...children].filter(Boolean) as import('@/lib/types').CustomerWithHealth[];
  const rollupMrr = family.reduce((s, f) => s + f.mrr, 0);
  const blendedHealth = Math.round(family.reduce((s, f) => s + f.health.score, 0) / family.length);

  function FamilyRow({
    cust,
    role,
    isCurrent,
  }: {
    cust: import('@/lib/types').CustomerWithHealth;
    role: string;
    isCurrent: boolean;
  }) {
    const bc = bandColor(cust.health.band);
    return (
      <Link
        href={`/customers/${cust.id}`}
        className={`flex items-center gap-2 rounded px-2 py-[7px] transition-colors hover:bg-paper ${
          isCurrent ? 'bg-surface' : ''
        }`}
      >
        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: bc.fg }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium text-ink-1">
            {cust.name}
            {isCurrent && <span className="ml-1 text-[10px] text-ink-4">· current</span>}
          </div>
          <div className="text-[10.5px] text-ink-4">{role}</div>
        </div>
        <span className="num shrink-0 text-[11.5px] text-ink-3">{fmtCurrency(cust.mrr)}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded border border-line bg-paper px-3 py-2">
        <div>
          <div className="text-[10px] uppercase tracking-eyebrow text-ink-4">Family ARR</div>
          <div className="num text-[14px] font-semibold text-ink-1">{fmtCurrency(rollupMrr * 12)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-eyebrow text-ink-4">Blended health</div>
          <div
            className="num text-[14px] font-semibold"
            style={{
              color: blendedHealth >= 70 ? '#2a9c5e' : blendedHealth >= 40 ? '#d97706' : '#f06a2a',
            }}
          >
            {blendedHealth}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        {parent && <FamilyRow cust={parent} role="Parent account" isCurrent={false} />}
        {!parent && <FamilyRow cust={current} role="Parent account" isCurrent={true} />}
        {parent && <FamilyRow cust={current} role="This account" isCurrent={true} />}
        {children.map((ch) => (
          <FamilyRow key={ch.id} cust={ch} role="Subsidiary" isCurrent={false} />
        ))}
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  valueColor,
}: {
  k: string;
  v: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2">
      <span className="text-[12px] text-ink-4">{k}</span>
      <span
        className="text-[12.5px] font-medium"
        style={{ color: valueColor ?? '#0a0a0a' }}
      >
        {v}
      </span>
    </div>
  );
}
