import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-900 text-ink-100 md:flex">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 font-semibold text-white">
          P
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Planhat</div>
          <div className="text-[11px] text-ink-400">Customer Success</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 text-sm">
        <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          Workspace
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md bg-ink-800 px-3 py-2 text-white"
        >
          <span aria-hidden>👥</span> Customers
        </Link>
        <SideItem icon="📈" label="Analytics" />
        <SideItem icon="🎯" label="Playbooks" />
        <SideItem icon="📅" label="Calendar" />
        <SideItem icon="🔔" label="Alerts" />

        <div className="px-2 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          Account
        </div>
        <SideItem icon="⚙️" label="Settings" />
      </nav>

      <div className="border-t border-ink-800 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white">
            S
          </div>
          <div>
            <div className="font-medium text-white">Sam Dijkstra</div>
            <div className="text-ink-400">CSM Lead</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SideItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-ink-300 opacity-70 hover:bg-ink-800">
      <span aria-hidden>{icon}</span> {label}
    </div>
  );
}
