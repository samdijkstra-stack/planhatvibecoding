import { listCustomers } from '@/lib/customers';
import CustomerTable from '@/components/CustomerTable';
import type { CustomerWithHealth } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const customers = listCustomers();
  const totals = summarize(customers);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Workspace</div>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">Customers</h1>
          <p className="mt-1 text-sm text-ink-500">
            All accounts assigned to your team. Default sort surfaces lowest health first.
          </p>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Total customers" value={totals.total} accent="ink" />
        <StatCard label="Healthy" value={totals.green} accent="good" dot />
        <StatCard label="At watch" value={totals.amber} accent="warn" dot />
        <StatCard label="Critical" value={totals.red} accent="bad" dot />
        <StatCard
          label="Churn risks"
          value={totals.churnRisk}
          accent="bad"
          icon="🚩"
        />
      </section>

      <CustomerTable customers={customers} />
    </div>
  );
}

function summarize(customers: CustomerWithHealth[]) {
  return customers.reduce(
    (acc, c) => {
      acc.total += 1;
      if (c.health.band === 'green') acc.green += 1;
      else if (c.health.band === 'amber') acc.amber += 1;
      else acc.red += 1;
      if (c.churnRisk) acc.churnRisk += 1;
      return acc;
    },
    { total: 0, green: 0, amber: 0, red: 0, churnRisk: 0 }
  );
}

function StatCard({
  label,
  value,
  accent,
  dot,
  icon,
}: {
  label: string;
  value: number;
  accent: 'ink' | 'good' | 'warn' | 'bad';
  dot?: boolean;
  icon?: string;
}) {
  const accentText: Record<typeof accent, string> = {
    ink: 'text-ink-900',
    good: 'text-good-700',
    warn: 'text-warn-700',
    bad: 'text-bad-700',
  };
  const accentDot: Record<typeof accent, string> = {
    ink: 'bg-ink-500',
    good: 'bg-good-500',
    warn: 'bg-warn-500',
    bad: 'bg-bad-500',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500">
        {dot && <span className={`h-2 w-2 rounded-full ${accentDot[accent]}`} />}
        {icon && <span aria-hidden>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-semibold ${accentText[accent]}`}>{value}</div>
    </div>
  );
}
