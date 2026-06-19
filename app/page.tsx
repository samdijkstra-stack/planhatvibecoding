import Link from 'next/link';
import { listCustomers } from '@/lib/customers';
import CustomerTable from '@/components/CustomerTable';
import { ChurnFlag } from '@/components/ChurnFlag';
import type { CustomerWithHealth } from '@/lib/types';

export const dynamic = 'force-dynamic';

type HealthFilter = 'all' | 'green' | 'amber' | 'red';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const customers = await listCustomers();
  const totals = summarize(customers);

  const healthParam = typeof searchParams.health === 'string' ? searchParams.health : 'all';
  const initialHealth: HealthFilter = ['green', 'amber', 'red'].includes(healthParam)
    ? (healthParam as HealthFilter)
    : 'all';
  const initialRisk = searchParams.risk === '1' || searchParams.risk === 'true';

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-line px-8 pt-[22px]">
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">Customers</h1>
        <p className="mb-4 mt-1 text-[12.5px] text-ink-4">
          All accounts assigned to your team. Default sort surfaces lowest health first.
        </p>
        <div className="-mx-8 flex border-t border-line pl-8">
          <StatCell value={totals.total} label="Total customers" href="/" />
          <StatCell value={totals.green} label="Healthy" color="#2a9c5e" href="/?health=green" />
          <StatCell value={totals.amber} label="At watch" color="#d97706" href="/?health=amber" />
          <StatCell value={totals.red} label="Critical" color="#f06a2a" href="/?health=red" last />
          <StatCell
            value={totals.churnRisk}
            label="Churn risks"
            color="#f06a2a"
            icon={<ChurnFlag />}
            href="/?risk=1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CustomerTable
          customers={customers}
          initialHealth={initialHealth}
          initialRisk={initialRisk}
        />
      </div>
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

function StatCell({
  value,
  label,
  color,
  last,
  icon,
  href,
}: {
  value: number;
  label: string;
  color?: string;
  last?: boolean;
  icon?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-[5px]">
        {icon && <span style={{ color }}>{icon}</span>}
        <span
          className="display num leading-none"
          style={{ fontSize: 21, fontWeight: 600, color: color ?? '#0a0a0a' }}
        >
          {value}
        </span>
      </div>
      <div className="mt-[3px] text-[10.5px] text-ink-4">{label}</div>
    </>
  );
  const style = {
    borderRight: last ? undefined : '1px solid #e5e5e5',
    marginRight: 28,
  } as const;
  if (href) {
    return (
      <Link
        href={href}
        className="group py-[14px] pr-7 transition-opacity hover:opacity-70"
        style={style}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="py-[14px] pr-7" style={style}>
      {inner}
    </div>
  );
}
