import Link from 'next/link';
import { listCustomers } from '@/lib/customers';
import { PLAYBOOKS } from '@/lib/playbooks';

export const dynamic = 'force-dynamic';

export default async function PlaybooksPage() {
  const customers = await listCustomers();

  return (
    <div className="bg-white">
      <div className="border-b border-line px-8 pb-5 pt-[22px]">
        <div className="eyebrow mb-2">Playbooks</div>
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">
          Codify how your team responds
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-4">
          Pre-built sequences that fire when an account meets a trigger condition. Edit, branch, or
          assemble new playbooks from the same atoms.
        </p>
      </div>

      <div className="px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYBOOKS.map((p) => {
            const inFlight = p.match(customers, []).length > 0
              ? p.match(customers, []).map(m => m.customer.id).filter((v, i, a) => a.indexOf(v) === i).length
              : 0;
            // count distinct customers matching trigger
            const matchingCustomers = new Set(
              customers.filter((c) => {
                if (p.slug === 'renewal-save-play') return c.churnRisk && c.daysToRenewal <= 60;
                if (p.slug === 'detractor-followup') return c.nps < 0;
                if (p.slug === 'onboarding-kickoff') return c.created_at > new Date(Date.now() - 30 * 86400000).toISOString();
                if (p.slug === 'power-user-expansion') return c.usage >= 85 && c.health.score >= 70;
                if (p.slug === 'quarterly-business-review') return c.tier === 'Enterprise';
                if (p.slug === 'critical-health-intervention') return c.health.band === 'red';
                return false;
              }).map((c) => c.id)
            ).size;

            return (
              <Link key={p.slug} href={`/playbooks/${p.slug}`} className="group block">
                <article className="h-full rounded border border-line bg-white p-6 transition-colors duration-150 hover:border-ink-3">
                  <div className="eyebrow mb-3">{p.category}</div>
                  <h2 className="display text-[18px] leading-[1.25] text-ink-1">{p.title}</h2>
                  <p className="mt-3 line-clamp-3 text-[12.5px] leading-[1.55] text-ink-3">
                    {p.description.split('\n')[0]}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
                    <Stat label="Steps" value={String(p.steps.length)} />
                    <Stat
                      label="In flight"
                      value={String(matchingCustomers)}
                      color={matchingCustomers > 0 ? '#f06a2a' : '#0a0a0a'}
                    />
                  </div>

                  <div className="mt-4 text-[10.5px] uppercase tracking-eyebrow text-ink-4">
                    Trigger
                  </div>
                  <div className="mt-1 text-[12px] text-ink-2">{p.trigger}</div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[11px] text-ink-4">Last edited 6d ago</span>
                    <span className="text-[11.5px] text-ink-3 transition-colors group-hover:text-ink-1">
                      Open ↗
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-eyebrow text-ink-4">{label}</div>
      <div className="display num mt-[2px] text-[18px]" style={{ color: color ?? '#0a0a0a' }}>
        {value}
      </div>
    </div>
  );
}
