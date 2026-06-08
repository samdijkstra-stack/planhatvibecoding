'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CustomerWithHealth } from '@/lib/types';
import { SmallHealthBar } from './HealthBadge';
import { ChurnFlag } from './ChurnFlag';

type SortKey = 'health' | 'renewal' | 'mrr' | 'name';
type SortDir = 'asc' | 'desc';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function fmtCurrency(n: number) {
  return `€${n.toLocaleString('en-GB')}`;
}

function fmtDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(',', '');
}

function Avatar({ init, size = 26 }: { init: string; size?: number }) {
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

function SortIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden>
      <path d="M2 3.5l3-2.5 3 2.5M2 6.5l3 2.5 3-2.5" />
    </svg>
  );
}

const SORTABLE = new Set<SortKey | 'tier' | 'csm' | 'risk'>(['name', 'mrr', 'renewal', 'health']);

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
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(k);
      setSortDir(k === 'health' || k === 'renewal' ? 'asc' : 'desc');
    }
  }

  const headerCell = 'whitespace-nowrap bg-paper text-[10px] font-medium uppercase tracking-eyebrow text-ink-4 border-b border-line sticky top-0';

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className={`${headerCell} px-8 py-[9px] text-left`}>
            <button
              onClick={() => toggle('name')}
              className="inline-flex items-center gap-1 hover:text-ink-2"
            >
              Customer <SortIcon />
            </button>
          </th>
          <th className={`${headerCell} px-4 py-[9px] text-left`}>Tier</th>
          <th className={`${headerCell} px-4 py-[9px] text-right`}>
            <button onClick={() => toggle('mrr')} className="inline-flex items-center gap-1 hover:text-ink-2">
              MRR <SortIcon />
            </button>
          </th>
          <th className={`${headerCell} px-4 py-[9px] text-right`}>
            <button onClick={() => toggle('renewal')} className="inline-flex items-center gap-1 hover:text-ink-2">
              Renewal <SortIcon />
            </button>
          </th>
          <th className={`${headerCell} px-4 py-[9px] text-left`}>CSM</th>
          <th className={`${headerCell} px-4 py-[9px] text-right`}>
            <button onClick={() => toggle('health')} className="inline-flex items-center gap-1 hover:text-ink-2">
              Health <SortIcon />
            </button>
          </th>
          <th className={`${headerCell} w-7 py-[9px] pl-2 pr-6`}></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((c) => {
          const renewalSoon = c.daysToRenewal <= 60 && c.daysToRenewal >= 0;
          return (
            <tr key={c.id} className="border-b border-line bg-white transition-colors duration-75 hover:bg-paper">
              <td className="whitespace-nowrap px-8 py-[10px]">
                <Link href={`/customers/${c.id}`} className="flex items-center gap-[10px]">
                  <Avatar init={initials(c.name)} />
                  <span className="text-[13.5px] font-medium text-ink-1">{c.name}</span>
                </Link>
              </td>
              <td className="px-4 py-[10px]">
                <TierBadge tier={c.tier} />
              </td>
              <td className="num px-4 py-[10px] text-right text-[13px] font-medium text-ink-2">
                {fmtCurrency(c.mrr)}
              </td>
              <td className="px-4 py-[10px] text-right">
                <div
                  className="text-[12.5px]"
                  style={{
                    color: renewalSoon ? '#d97706' : '#1f1f1f',
                    fontWeight: renewalSoon ? 500 : 400,
                  }}
                >
                  {fmtDate(c.renewal_date)}
                </div>
                <div
                  className="mt-[1px] text-[10.5px]"
                  style={{ color: renewalSoon ? '#d97706' : '#b8b8b8' }}
                >
                  {c.daysToRenewal}d away
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-[10px] text-[12.5px] text-ink-3">{c.csm}</td>
              <td className="px-4 py-[10px] text-right">
                <SmallHealthBar score={c.health.score} band={c.health.band} />
              </td>
              <td className="w-7 py-[10px] pl-2 pr-6 text-center">
                {c.churnRisk ? (
                  <span className="inline-flex text-signal" aria-label="Churn risk">
                    <ChurnFlag />
                  </span>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
