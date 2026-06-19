import { W_NPS, W_TICKETS, W_USAGE, TICKET_SATURATION } from '@/lib/health';

const TEAM = [
  { name: 'Sam Dijkstra', role: 'CSM Lead', email: 'sam.dijkstra@planhat.com', initial: 'S' },
  { name: 'Lina Carlsson', role: 'Senior CSM', email: 'lina.carlsson@planhat.com', initial: 'L' },
  { name: 'Daniel Park', role: 'Senior CSM', email: 'daniel.park@planhat.com', initial: 'D' },
  { name: 'Maya Lopez', role: 'CSM', email: 'maya.lopez@planhat.com', initial: 'M' },
];

export default function SettingsPage() {
  return (
    <>
      <Section title="Workspace">
        <Field label="Workspace name" value="Planhat Demo" />
        <Field label="Default currency" value="EUR (€)" />
        <Field label="Date format" value="DD MMM YYYY" />
        <Field label="Locale" value="en-GB" />
      </Section>

      <Section
        title="Health score weights"
        description="Score is a weighted blend, recomputed on every read. Adjust in lib/health.ts."
      >
        <WeightRow label="Usage" weight={W_USAGE} />
        <WeightRow label="Support load" weight={W_TICKETS} />
        <WeightRow label="NPS" weight={W_NPS} />
        <div className="mt-3 text-[11.5px] text-ink-4">
          Support saturation: {TICKET_SATURATION} tickets caps the support axis at zero.
        </div>
      </Section>

      <Section title="Health bands">
        <BandRow band="Healthy" range="≥ 70" color="#2a9c5e" />
        <BandRow band="At watch" range="40 – 69" color="#d97706" />
        <BandRow band="Critical" range="< 40" color="#f06a2a" />
        <div className="mt-3 text-[11.5px] text-ink-4">
          A customer is flagged as churn risk when health is critical, or when renewal is within 60
          days and health is below 60.
        </div>
      </Section>

      <Section title="Team">
        <ul className="flex flex-col">
          {TEAM.map((m) => (
            <li
              key={m.email}
              className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-surface text-[13px] font-semibold text-ink-3">
                {m.initial}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-ink-1">{m.name}</div>
                <div className="text-[11.5px] text-ink-4">{m.role}</div>
              </div>
              <a
                href={`mailto:${m.email}`}
                className="text-[12px] text-blue hover:underline"
              >
                {m.email}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="About">
        <Field label="Version" value="0.1.0 — Workshop demo" />
        <Field
          label="Source"
          value={
            <a
              href="https://github.com/samdijkstra-stack/planhatvibecoding"
              className="text-blue hover:underline"
            >
              samdijkstra-stack/planhatvibecoding
            </a>
          }
        />
        <Field label="Database" value="libSQL in-memory · fresh on every cold start" />
      </Section>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line px-8 py-6">
      <div className="mb-1 text-[12.5px] font-medium text-ink-1">{title}</div>
      {description && <div className="mb-4 text-[11.5px] text-ink-4">{description}</div>}
      {!description && <div className="mb-3" />}
      <div>{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-b-0">
      <span className="text-[12px] text-ink-4">{label}</span>
      <span className="text-[12.5px] font-medium text-ink-1">{value}</span>
    </div>
  );
}

function WeightRow({ label, weight }: { label: string; weight: number }) {
  const pct = Math.round(weight * 100);
  return (
    <div
      className="grid items-center gap-3 py-2"
      style={{ gridTemplateColumns: '120px 1fr 50px' }}
    >
      <span className="text-[12.5px] text-ink-2">{label}</span>
      <div className="h-[6px] overflow-hidden rounded-[2px] bg-line">
        <div className="h-full rounded-[2px] bg-ink-1" style={{ width: `${pct}%` }} />
      </div>
      <span className="num text-right text-[12.5px] font-medium text-ink-1">{pct}%</span>
    </div>
  );
}

function BandRow({ band, range, color }: { band: string; range: string; color: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="h-[8px] w-[8px] rounded-full" style={{ background: color }} />
        <span className="text-[12.5px] text-ink-1">{band}</span>
      </div>
      <span className="num text-[12.5px] text-ink-3">{range}</span>
    </div>
  );
}
