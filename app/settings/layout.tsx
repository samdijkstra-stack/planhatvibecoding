import { SettingsTabs } from '@/components/SettingsTabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <div className="border-b border-line px-8 pb-0 pt-[22px]">
        <div className="eyebrow mb-2">Workspace</div>
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">Settings</h1>
        <SettingsTabs />
      </div>
      {children}
    </div>
  );
}
