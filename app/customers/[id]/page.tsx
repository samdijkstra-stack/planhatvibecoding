import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActivities, getContacts, getCustomer } from '@/lib/customers';
import { HealthBadge } from '@/components/HealthBadge';
import { ChurnFlag } from '@/components/ChurnFlag';
import ActivityTimeline from '@/components/ActivityTimeline';
import LogTouchpointForm from '@/components/LogTouchpointForm';
import SlackAlertButton from '@/components/SlackAlertButton';
import { W_NPS, W_TICKETS, W_USAGE } from '@/lib/health';

export const dynamic = 'force-dynamic';

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const TIER_STYLES: Record<string, string> = {
  Starter: 'bg-ink-100 border-ink-200 text-ink-700',
  Pro: 'bg-brand-50 border-brand-500/30 text-brand-700',
  Enterprise: 'bg-ink-900/5 border-ink-900/20 text-ink-900',
};

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const c = await getCustomer(params.id);
  if (!c) notFound();

  const [contacts, activities] = await Promise.all([getContacts(c.id), getActivities(c.id)]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <nav className="mb-4 text-sm text-ink-500">
        <Link href="/" className="hover:text-brand-600">
          ← Customers
        </Link>
      </nav>

      {/* Header */}
      <header className="card mb-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-semibold text-brand-700">
              {c.name
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-ink-900">{c.name}</h1>
                <span className={`chip ${TIER_STYLES[c.tier] ?? ''}`}>{c.tier}</span>
                {c.churnRisk && <ChurnFlag size="lg" />}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                <Meta label="MRR">{fmtCurrency(c.mrr)}</Meta>
                <Meta label="Renewal">
                  {fmtDate(c.renewal_date)}
                  <span className="ml-1 text-ink-500">({c.daysToRenewal}d away)</span>
                </Meta>
                <Meta label="CSM">{c.csm}</Meta>
                <Meta label="Customer since">{fmtDate(c.created_at)}</Meta>
              </dl>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <HealthBadge score={c.health.score} band={c.health.band} size="lg" />
            {(c.health.band === 'red' || c.churnRisk) && (
              <SlackAlertButton customerId={c.id} />
            )}
          </div>
        </div>

        {c.churnRisk && (
          <div className="mt-5 flex items-start gap-3 rounded-md border border-bad-500/30 bg-bad-50 p-3 text-sm text-bad-700">
            <span aria-hidden className="text-base">🚩</span>
            <div>
              <div className="font-semibold">Churn risk detected</div>
              <div className="opacity-90">
                {c.health.band === 'red'
                  ? `Health score ${c.health.score} sits in the red band.`
                  : `Renewal is in ${c.daysToRenewal} days and health is below 60.`}{' '}
                Consider a save-play and escalating internally.
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Health breakdown */}
          <section className="card p-5">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Health breakdown
            </h2>
            <div className="mb-4 text-xs text-ink-500">
              Weighted blend of usage ({Math.round(W_USAGE * 100)}%), support ticket load (
              {Math.round(W_TICKETS * 100)}%) and NPS ({Math.round(W_NPS * 100)}%).
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Driver
                title="Usage"
                value={`${Math.round(c.usage)}%`}
                contribution={c.health.usageComponent}
                max={W_USAGE * 100}
                accent="brand"
              />
              <Driver
                title="Support load"
                value={`${c.open_tickets} open ${c.open_tickets === 1 ? 'ticket' : 'tickets'}`}
                contribution={c.health.ticketsComponent}
                max={W_TICKETS * 100}
                accent="warn"
              />
              <Driver
                title="NPS"
                value={`${c.nps > 0 ? '+' : ''}${c.nps}`}
                contribution={c.health.npsComponent}
                max={W_NPS * 100}
                accent="good"
              />
            </div>
          </section>

          {/* Timeline */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
                Activity timeline
              </h2>
              <span className="text-xs text-ink-500">{activities.length} events</span>
            </div>
            <ActivityTimeline activities={activities} />
          </section>

          <LogTouchpointForm customerId={c.id} defaultAuthor={c.csm} />
        </div>

        <aside className="space-y-5">
          {/* Contacts */}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Key contacts
            </h2>
            {contacts.length === 0 ? (
              <div className="text-sm text-ink-500">No contacts on file.</div>
            ) : (
              <ul className="space-y-3">
                {contacts.map((co) => (
                  <li key={co.id} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
                      {co.name
                        .split(/\s+/)
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink-900">{co.name}</div>
                      <div className="truncate text-xs text-ink-500">{co.role}</div>
                      <a
                        href={`mailto:${co.email}`}
                        className="truncate text-xs text-brand-600 hover:underline"
                      >
                        {co.email}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quick facts */}
          <section className="card p-5 text-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Quick facts
            </h2>
            <dl className="space-y-2">
              <Row label="Plan tier" value={c.tier} />
              <Row label="MRR" value={fmtCurrency(c.mrr)} />
              <Row label="ARR (approx.)" value={fmtCurrency(c.mrr * 12)} />
              <Row label="Active usage" value={`${Math.round(c.usage)}%`} />
              <Row label="Open tickets" value={String(c.open_tickets)} />
              <Row label="NPS" value={`${c.nps > 0 ? '+' : ''}${c.nps}`} />
              <Row label="Last alerted" value={c.alerted_at ? new Date(c.alerted_at).toLocaleString() : '—'} />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function Driver({
  title,
  value,
  contribution,
  max,
  accent,
}: {
  title: string;
  value: string;
  contribution: number;
  max: number;
  accent: 'brand' | 'warn' | 'good';
}) {
  const pct = Math.max(0, Math.min(100, (contribution / max) * 100));
  const colors: Record<typeof accent, { bar: string; text: string }> = {
    brand: { bar: 'bg-brand-500', text: 'text-brand-700' },
    warn: { bar: 'bg-warn-500', text: 'text-warn-700' },
    good: { bar: 'bg-good-500', text: 'text-good-700' },
  };
  return (
    <div className="rounded-md border border-ink-100 p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{title}</div>
        <div className={`text-xs font-semibold ${colors[accent].text}`}>
          +{contribution} / {Math.round(max)}
        </div>
      </div>
      <div className="mt-1 text-base font-semibold text-ink-900">{value}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full ${colors[accent].bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
