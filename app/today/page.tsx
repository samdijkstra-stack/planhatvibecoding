import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken } from '@/lib/auth';
import { listCustomers, getActivities, getContacts } from '@/lib/customers';
import { deriveEvents, EVENT_META, addDays } from '@/lib/events';
import { getHealthSuggestions } from '@/lib/suggestions';
import { ChurnFlag } from '@/components/ChurnFlag';
import { bandColor } from '@/components/HealthBadge';
import type { CustomerWithHealth } from '@/lib/types';

export const dynamic = 'force-dynamic';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtShortDate(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtEur(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `€${n.toLocaleString('en-GB')}`;
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

function HealthBar({ score, band }: { score: number; band: string }) {
  const color = band === 'green' ? '#2a9c5e' : band === 'amber' ? '#d97706' : '#f06a2a';
  return (
    <div className="flex items-center gap-2">
      <div className="h-[5px] w-[60px] overflow-hidden rounded-[2px] bg-line">
        <div className="h-full rounded-[2px]" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="num text-[11.5px] font-medium" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default async function TodayPage() {
  const token = cookies().get('ph_session')?.value;
  const sessionUser = token ? verifySessionToken(token) : null;
  if (!sessionUser) redirect('/login');

  const customers = await listCustomers();
  const now = new Date();
  const windowEnd = addDays(now, 14);

  // Events in the next 14 days
  const allEvents = deriveEvents(customers, 90);
  const weekEvents = allEvents.filter((e) => e.date >= now && e.date <= windowEnd);

  // Unique customers in the week's events (for pre-fetching activities + contacts)
  const agendaCustomerIds = [...new Set(weekEvents.map((e) => e.customer.id))];
  const [activitiesMap, contactsMap] = await Promise.all([
    Promise.all(agendaCustomerIds.map((id) => getActivities(id).then((a) => [id, a] as const))).then(
      (pairs) => new Map(pairs)
    ),
    Promise.all(agendaCustomerIds.map((id) => getContacts(id).then((c) => [id, c] as const))).then(
      (pairs) => new Map(pairs)
    ),
  ]);

  // Needs attention: churn-risk accounts, sorted by urgency (renewal asc, health asc)
  const atRisk = customers
    .filter((c) => c.churnRisk || c.health.band === 'red')
    .sort((a, b) => {
      // Priority: churn risk with closest renewal first
      const aScore = (a.churnRisk ? 0 : 1000) + a.daysToRenewal;
      const bScore = (b.churnRisk ? 0 : 1000) + b.daysToRenewal;
      return aScore - bScore;
    })
    .slice(0, 6);

  // Suggested actions: top suggestion per customer, sorted by priority
  const allSuggestions = customers
    .flatMap((c) => {
      const s = getHealthSuggestions(c);
      if (s.length === 0) return [];
      return [{ customer: c, suggestion: s[0] }];
    })
    .filter((x) => x.suggestion.priority === 'critical')
    .sort((a, b) => a.customer.daysToRenewal - b.customer.daysToRenewal)
    .slice(0, 5);

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-line px-8 pb-5 pt-[22px]">
        <div className="eyebrow mb-2">{fmtDate(now)}</div>
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">
          {greeting()}, {sessionUser.name.split(' ')[0]}.
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-4">
          {weekEvents.length} event{weekEvents.length !== 1 ? 's' : ''} in the next two weeks ·{' '}
          {atRisk.length} account{atRisk.length !== 1 ? 's' : ''} need attention
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        {/* ── Left: Agenda ──────────────────────────────────────────────── */}
        <div className="border-r border-line">
          <div className="border-b border-line px-8 py-4">
            <div className="eyebrow-sm">Agenda — next 14 days</div>
          </div>

          {weekEvents.length === 0 ? (
            <div className="px-8 py-8 text-[12.5px] text-ink-4">
              No events in the next 14 days.{' '}
              <Link href="/calendar" className="text-ink-2 hover:underline">
                View full calendar ↗
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {weekEvents.map((ev) => {
                const c = ev.customer;
                const meta = EVENT_META[ev.type];
                const activities = activitiesMap.get(c.id) ?? [];
                const contacts = contactsMap.get(c.id) ?? [];
                const lastAct = activities[0];
                const primaryContact = contacts[0];
                const bc = bandColor(c.health.band);
                const suggestions = getHealthSuggestions(c).slice(0, 2);

                return (
                  <li key={ev.id} className="px-8 py-5">
                    {/* Event header */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-[5px] flex items-center gap-2">
                          <span
                            className="inline-flex items-center rounded-rect px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.06em]"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[11.5px] text-ink-4">{fmtShortDate(ev.date)}</span>
                        </div>
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-[15px] font-semibold text-ink-1 hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.churnRisk && (
                          <span className="ml-2 inline-flex items-center gap-[4px] rounded-rect bg-signal-soft px-[6px] py-[2px] text-[10px] font-medium text-signal-deep">
                            <ChurnFlag size={9} />
                            Churn risk
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <HealthBar score={c.health.score} band={c.health.band} />
                        <div className="mt-1 text-[10.5px] text-ink-4">
                          {fmtEur(c.mrr)}/mo · {c.daysToRenewal}d to renewal
                        </div>
                      </div>
                    </div>

                    {/* Prep grid */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Last activity */}
                      <div className="rounded border border-line bg-paper p-3">
                        <div className="eyebrow mb-[6px]">Last activity</div>
                        {lastAct ? (
                          <>
                            <div className="text-[11.5px] font-medium capitalize text-ink-2">
                              {lastAct.type} · {relTime(lastAct.timestamp)}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[11.5px] leading-[1.5] text-ink-4">
                              {lastAct.text}
                            </div>
                          </>
                        ) : (
                          <div className="text-[11.5px] text-ink-5">No recent activity</div>
                        )}
                      </div>

                      {/* Key contact */}
                      <div className="rounded border border-line bg-paper p-3">
                        <div className="eyebrow mb-[6px]">Key contact</div>
                        {primaryContact ? (
                          <>
                            <div className="text-[11.5px] font-medium text-ink-1">
                              {primaryContact.name}
                            </div>
                            <div className="text-[11px] text-ink-4">{primaryContact.role}</div>
                            <a
                              href={`mailto:${primaryContact.email}`}
                              className="mt-1 block text-[11px] text-blue hover:underline"
                            >
                              {primaryContact.email}
                            </a>
                          </>
                        ) : (
                          <div className="text-[11.5px] text-ink-5">No contacts logged</div>
                        )}
                      </div>

                      {/* Top suggestion */}
                      <div
                        className="rounded border p-3"
                        style={
                          suggestions[0]?.priority === 'critical'
                            ? { borderColor: '#f06a2a', background: '#fff8f5' }
                            : { borderColor: '#e5e5e5', background: '#fafafa' }
                        }
                      >
                        <div className="eyebrow mb-[6px]">Prep note</div>
                        {suggestions[0] ? (
                          <>
                            <div className="text-[11.5px] font-medium leading-[1.4] text-ink-1">
                              {suggestions[0].action}
                            </div>
                            {suggestions[0].playbookSlug && (
                              <Link
                                href={`/playbooks/${suggestions[0].playbookSlug}`}
                                className="mt-2 inline-block text-[11px] font-medium text-signal hover:underline"
                              >
                                {suggestions[0].playbookLabel} ↗
                              </Link>
                            )}
                          </>
                        ) : (
                          <div className="text-[11.5px] text-ink-4">Account is in good shape.</div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {weekEvents.length > 0 && (
            <div className="border-t border-line px-8 py-4">
              <Link href="/calendar" className="text-[12px] text-ink-3 hover:text-ink-1">
                View full 90-day calendar ↗
              </Link>
            </div>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="flex flex-col">
          {/* Needs attention */}
          <section className="border-b border-line px-6 py-5">
            <div className="eyebrow-sm mb-3">Needs attention</div>
            {atRisk.length === 0 ? (
              <p className="text-[12.5px] text-ink-4">All accounts are healthy.</p>
            ) : (
              <ul className="flex flex-col gap-0 divide-y divide-line">
                {atRisk.map((c) => {
                  const bc = bandColor(c.health.band);
                  return (
                    <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href={`/customers/${c.id}`} className="group flex items-start gap-3">
                        <span
                          className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
                          style={{ background: bc.fg }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-ink-1 group-hover:underline">
                              {c.name}
                            </span>
                            {c.churnRisk && (
                              <span className="text-signal">
                                <ChurnFlag size={9} />
                              </span>
                            )}
                          </div>
                          <div className="mt-[2px] text-[11px] text-ink-4">
                            Health {c.health.score} · {c.daysToRenewal}d to renewal ·{' '}
                            {c.open_tickets} tickets
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Suggested actions */}
          <section className="px-6 py-5">
            <div className="eyebrow-sm mb-3">Suggested actions</div>
            {allSuggestions.length === 0 ? (
              <p className="text-[12.5px] text-ink-4">No critical actions outstanding.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {allSuggestions.map(({ customer: c, suggestion: s }, i) => (
                  <li key={i} className="rounded border border-line p-3">
                    <div className="mb-[2px] flex items-start justify-between gap-2">
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-[12px] font-semibold text-ink-1 hover:underline"
                      >
                        {c.name}
                      </Link>
                      <span className="shrink-0 text-[10.5px] text-ink-5">
                        {c.daysToRenewal}d
                      </span>
                    </div>
                    <div className="text-[11.5px] leading-[1.45] text-ink-3">{s.action}</div>
                    {s.playbookSlug && (
                      <Link
                        href={`/playbooks/${s.playbookSlug}`}
                        className="mt-2 inline-block text-[11px] font-medium text-signal hover:underline"
                      >
                        {s.playbookLabel} ↗
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
