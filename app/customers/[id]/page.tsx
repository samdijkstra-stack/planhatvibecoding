import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActivities, getContacts, getCustomer } from '@/lib/customers';
import { HealthRing, bandColor } from '@/components/HealthBadge';
import { ChurnFlag } from '@/components/ChurnFlag';
import ActivityTimeline from '@/components/ActivityTimeline';
import LogTouchpointForm from '@/components/LogTouchpointForm';
import SlackAlertButton from '@/components/SlackAlertButton';
import { W_NPS, W_TICKETS, W_USAGE, TICKET_SATURATION, clamp } from '@/lib/health';

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

  const [contacts, activities] = await Promise.all([getContacts(c.id), getActivities(c.id)]);

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
            <div className="eyebrow-sm mb-[10px]">Health breakdown</div>
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
