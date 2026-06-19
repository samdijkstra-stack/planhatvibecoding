'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function HatLogo() {
  return (
    <svg width="22" height="22" viewBox="5 35 461 244" fill="white" aria-hidden>
      <path d="M235.63,175.72c-127.38,0-230.63,25.14-230.63,51.57s103.26,51.57,230.63,51.57,230.63-25.14,230.63-51.57-103.26-51.57-230.63-51.57Z" />
      <path d="M361.64,153.89c0-74.55-45.25-118.41-126.01-118.41s-126.01,43.86-126.01,118.41c15.25-7.04,62.79-19.14,126.01-19.14s110.76,12.1,126.01,19.14Z" />
    </svg>
  );
}

const stroke = {
  width: 15,
  height: 15,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ICONS = {
  today: (
    <svg {...stroke} aria-hidden>
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v3.5l2 2" />
    </svg>
  ),
  customers: (
    <svg {...stroke} aria-hidden>
      <path d="M10.5 13v-1a3 3 0 0 0-3-3h-3a3 3 0 0 0-3 3v1" />
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M14 13v-1a2.5 2.5 0 0 0-2-2.45" />
      <path d="M11 3.1a2.5 2.5 0 0 1 0 4.8" />
    </svg>
  ),
  analytics: (
    <svg {...stroke} aria-hidden>
      <rect x="1.5" y="9" width="2.5" height="5.5" rx="0.5" />
      <rect x="6.75" y="5" width="2.5" height="9.5" rx="0.5" />
      <rect x="12" y="1.5" width="2.5" height="13" rx="0.5" />
    </svg>
  ),
  forecast: (
    <svg {...stroke} aria-hidden>
      <path d="M1.5 11.5l4-4 3 3 6-6" />
      <path d="M11 4.5h3.5V8" />
    </svg>
  ),
  playbooks: (
    <svg {...stroke} aria-hidden>
      <circle cx="8" cy="8" r="6.5" />
      <circle cx="8" cy="8" r="2" />
      <line x1="8" y1="1.5" x2="8" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14.5" />
    </svg>
  ),
  calendar: (
    <svg {...stroke} aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" />
      <path d="M5 1.5v2M11 1.5v2M1.5 7h13" />
    </svg>
  ),
  alerts: (
    <svg {...stroke} aria-hidden>
      <path d="M8 1.5a5.5 5.5 0 0 1 5.5 5.5v3l1 1.5H1.5L2.5 10V7A5.5 5.5 0 0 1 8 1.5z" />
      <path d="M6.5 12a1.5 1.5 0 0 0 3 0" />
    </svg>
  ),
  settings: (
    <svg {...stroke} aria-hidden>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M12.6 3.4l-1.06 1.06M4.46 11.54l-1.06 1.06" />
    </svg>
  ),
};

interface NavItem {
  label: string;
  icon: ReactNode;
  href?: string;
  matchPrefix?: string;
  disabled?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Today', icon: ICONS.today, href: '/today' },
  { label: 'Customers', icon: ICONS.customers, href: '/', matchPrefix: '/customers' },
  { label: 'Analytics', icon: ICONS.analytics, href: '/analytics' },
  { label: 'Forecast', icon: ICONS.forecast, href: '/forecast' },
  { label: 'Playbooks', icon: ICONS.playbooks, href: '/playbooks' },
  { label: 'Calendar', icon: ICONS.calendar, href: '/calendar' },
  { label: 'Alerts', icon: ICONS.alerts, href: '/alerts' },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (!item.href) return false;
  if (item.href === '/') {
    if (pathname === '/') return true;
    if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
    return false;
  }
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

interface SidebarUser {
  name: string;
  initial: string;
  role: string;
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const settingsActive = pathname === '/settings' || pathname.startsWith('/settings/');
  const profileActive = pathname === '/profile' || pathname.startsWith('/profile/');

  return (
    <aside className="hidden h-screen w-[216px] shrink-0 flex-col bg-ink-1 md:flex">
      <div className="border-b border-white/[0.07] px-[18px] pb-[14px] pt-[18px]">
        <Link href="/" className="flex items-center gap-[9px]">
          <HatLogo />
          <span className="text-[14.5px] font-medium tracking-[-0.01em] text-white/95">Planhat</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-[10px]">
        <div className="px-[18px] pb-[5px] pt-1 text-[9px] font-medium uppercase tracking-eyebrow-wide text-white/[0.22]">
          Workspace
        </div>
        {NAV.map((item) => (
          <NavRow key={item.label} item={item} active={isActive(item, pathname)} />
        ))}

        <div className="mx-[18px] mt-[10px] border-t border-white/[0.07] pt-[10px]">
          <div className="pb-[5px] text-[9px] font-medium uppercase tracking-eyebrow-wide text-white/[0.22]">
            Account
          </div>
        </div>
        <NavRow
          item={{ label: 'Settings', icon: ICONS.settings, href: '/settings' }}
          active={settingsActive}
        />
      </nav>

      <div className="border-t border-white/[0.07]">
        <Link
          href="/profile"
          className={[
            'flex items-center gap-[9px] px-[14px] py-[10px] transition-colors duration-100',
            profileActive ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]',
          ].join(' ')}
        >
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[3px] bg-signal text-[11px] font-semibold text-white">
            {user.initial}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-[12.5px] font-medium leading-[1.3] text-white/[0.88]">
              {user.name}
            </div>
            <div className="text-[10.5px] capitalize text-white/[0.32]">{user.role}</div>
          </div>
        </Link>
        <a
          href="/api/auth/logout"
          className="flex w-full items-center px-[14px] py-[7px] text-[11px] text-white/[0.25] transition-colors hover:text-white/[0.5]"
        >
          Sign out
        </a>
      </div>
    </aside>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const inner = (
    <span
      className={[
        'flex w-full items-center gap-2 px-[18px] py-[7px] text-[13px] text-left transition-colors duration-[120ms] ease-ease',
        active
          ? 'border-l-2 border-signal bg-white/[0.07] font-medium text-white'
          : 'border-l-2 border-transparent font-normal text-white/[0.42] hover:text-white/[0.72]',
        item.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {item.icon}
      {item.label}
    </span>
  );
  if (item.href && !item.disabled) {
    return <Link href={item.href}>{inner}</Link>;
  }
  return <div>{inner}</div>;
}
