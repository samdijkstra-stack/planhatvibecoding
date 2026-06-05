'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CustomerWithHealth } from '@/lib/types';
import { HealthBadge } from './HealthBadge';
import { ChurnFlag } from './ChurnFlag';

type SortKey = 'health' | 'renewal' | 'mrr' | 'name';
type SortDir = 'asc' | 'desc';

const TIER_STYLES: Record<string, string> = {
  Starter: 'bg-ink-100 border-ink-200 text-ink-700',
  Pro: 'bg-brand-50 border-brand-500/30 text-brand-700',
  Enterprise: 'bg-ink-900/5 border-ink-900/20 text-ink-900',
};

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

export default function CustomerTable({ customers }: { customers: CustomerWithHealth[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('health');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const arr = [...customers];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'health':
          cmp = a.health.score - b.health.score;
          break;
        case 'renewal':
          cmp = a.daysToRenewal - b.daysToRenewal;
          break;
        case 'mrr':
          cmp = a.mrr - b.mrr;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [customers, sortKey, sortDir]);

  function toggle(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(k);
      setSortDir(k === 'health' || k === 'renewal' ? 'asc' : 'desc');
    }
  }

  function arrow(k: SortKey) {
    if (sortKey !== k) return <span className="text-ink-300">↕</span>;
    return <span className="text-ink-700">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ink-50 text-ink-500">
          <tr className="text-left">
            <Th onClick={() => toggle('name')}>
              <span>Customer</span> {arrow('name')}
            </Th>
            <Th>Tier</Th>
            <Th onClick={() => toggle('mrr')} className="text-right">
              <span>MRR</span> {arrow('mrr')}
            </Th>
            <Th onClick={() => toggle('renewal')}>
              <span>Renewal</span> {arrow('renewal')}
            </Th>
            <Th>CSM</Th>
            <Th onClick={() => toggle('health')}>
              <span>Health</span> {arrow('health')}
            </Th>
            <Th>Risk</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="border-t border-ink-100 hover:bg-ink-50/60">
              <td className="px-4 py-3">
                <Link href={`/customers/${c.id}`} className="font-medium text-ink-900 hover:text-brand-600">
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span className={`chip ${TIER_STYLES[c.tier] ?? ''}`}>{c.tier}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-800">{fmtCurrency(c.mrr)}</td>
              <td className="px-4 py-3 text-ink-800">
                <div className="flex flex-col">
                  <span>{fmtDate(c.renewal_date)}</span>
                  <span className="text-xs text-ink-500">{c.daysToRenewal}d away</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-800">{c.csm}</td>
              <td className="px-4 py-3">
                <HealthBadge score={c.health.score} band={c.health.band} />
              </td>
              <td className="px-4 py-3">{c.churnRisk ? <ChurnFlag /> : <span className="text-ink-300">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${
        onClick ? 'cursor-pointer select-none hover:text-ink-800' : ''
      } ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}
