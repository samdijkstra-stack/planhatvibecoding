import { listCustomers } from '@/lib/customers';
import CustomerTable from '@/components/CustomerTable';
import { ChurnFlag } from '@/components/ChurnFlag';
import type { CustomerWithHealth } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const customers = await listCustomers();
  const totals = summarize(customers);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-line px-8 pt-[22px]">
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">Customers</h1>
        <p className="mb-4 mt-1 text-[12.5px] text-ink-4">
          All accounts assigned to your team. Default sort surfaces lowest health first.
        </p>
        <div className="-mx-8 flex border-t border-line pl-8">
          <StatCell value={totals.total} label="Total customers" />
          <StatCell value={totals.green} label="Healthy" color="#2a9c5e" />
          <StatCell value={totals.amber} label="At watch" color="#d97706" />
          <StatCell value={totals.red} label="Critical" color="#f06a2a" last />
          <StatCell
            value={totals.churnRisk}
            label="Churn risks"
            color="#f06a2a"
            icon={<ChurnFlag />}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CustomerTable customers={customers} />
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
}: {
  value: number;
  label: string;
  color?: string;
  last?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="py-[14px] pr-7"
      style={{
        borderRight: last ? undefined : '1px solid #e5e5e5',
        marginRight: 28,
      }}
    >
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
    </div>
  );
}
