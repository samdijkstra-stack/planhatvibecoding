'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'General', href: '/settings', exact: true },
  { label: 'Integrations', href: '/settings/integrations' },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={[
              'mr-1 border-b-2 px-3 pb-[10px] text-[12.5px] font-medium transition-colors duration-100',
              active
                ? 'border-signal text-ink-1'
                : 'border-transparent text-ink-4 hover:text-ink-2',
            ].join(' ')}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
