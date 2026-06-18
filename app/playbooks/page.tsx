import { listCustomers } from '@/lib/customers';
import type { CustomerWithHealth } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Playbook {
  category: string;
  title: string;
  description: string;
  steps: number;
  trigger: string;
  count: (cs: CustomerWithHealth[]) => number;
}

const PLAYBOOKS: Playbook[] = [
  {
    category: 'Save play',
    title: 'Renewal save play',
    description:
      'Multi-touch sequence triggered when an at-risk account is within 60 days of renewal. Includes executive escalation, save offer template, and weekly check-ins.',
    steps: 7,
    trigger: 'Health < 60 and renewal ≤ 60 days',
    count: (cs) => cs.filter((c) => c.churnRisk && c.daysToRenewal <= 60).length,
  },
  {
    category: 'Adoption',
    title: 'Detractor follow-up',
    description:
      'Outreach cadence for accounts that returned a negative NPS. Discovery call, root-cause capture, and remediation plan handoff to engineering.',
    steps: 4,
    trigger: 'NPS < 0',
    count: (cs) => cs.filter((c) => c.nps < 0).length,
  },
  {
    category: 'Onboarding',
    title: 'Onboarding kickoff',
    description:
      'First 30 days after contract close — workspace setup, integration mapping, champion enablement, and a 60-day milestone review.',
    steps: 9,
    trigger: 'Account created within 30 days',
    count: () => 0,
  },
  {
    category: 'Expansion',
    title: 'Power user expansion',
    description:
      'Sequence for high-usage accounts approaching plan limits. Surfaces upsell signals, schedules an expansion conversation, and routes to AE.',
    steps: 5,
    trigger: 'Usage ≥ 85% and health ≥ 70',
    count: (cs) => cs.filter((c) => c.usage >= 85 && c.health.score >= 70).length,
  },
  {
    category: 'Adoption',
    title: 'Quarterly business review',
    description:
      'Structured QBR for Enterprise accounts — outcome review, roadmap alignment, and renewal preview. Auto-schedules 14 days before quarter end.',
    steps: 6,
    trigger: 'Enterprise tier · quarterly cadence',
    count: (cs) => cs.filter((c) => c.tier === 'Enterprise').length,
  },
  {
    category: 'Risk',
    title: 'Critical health intervention',
    description:
      'Immediate response when health drops into the critical band. Triages support load, validates champion engagement, and surfaces blockers to leadership.',
    steps: 5,
    trigger: 'Health < 40',
    count: (cs) => cs.filter((c) => c.health.band === 'red').length,
  },
];

export default async function PlaybooksPage() {
  const customers = await listCustomers();

  return (
    <div className="bg-white">
      <div className="border-b border-line px-8 pb-5 pt-[22px]">
        <div className="eyebrow mb-2">Playbooks</div>
        <h1 className="display text-[22px] leading-[1.1] text-ink-1">
          Codify how your team responds
        </h1>
        <p className="mt-1 text-[12.5px] text-ink-4">
          Pre-built sequences that fire when an account meets a trigger condition. Edit, branch, or
          assemble new playbooks from the same atoms.
        </p>
      </div>

      <div className="px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYBOOKS.map((p) => {
            const inFlight = p.count(customers);
            return (
              <article
                key={p.title}
                className="group rounded border border-line bg-white p-6 transition-colors duration-150 hover:border-line-s"
              >
                <div className="eyebrow mb-3">{p.category}</div>
                <h2 className="display text-[18px] leading-[1.25] text-ink-1">{p.title}</h2>
                <p className="mt-3 text-[12.5px] leading-[1.55] text-ink-3">{p.description}</p>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <Stat label="Steps" value={String(p.steps)} />
                  <Stat
                    label="In flight"
                    value={String(inFlight)}
                    color={inFlight > 0 ? '#f06a2a' : '#0a0a0a'}
                  />
                </div>

                <div className="mt-4 text-[10.5px] uppercase tracking-eyebrow text-ink-4">
                  Trigger
                </div>
                <div className="mt-1 text-[12px] text-ink-2">{p.trigger}</div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] text-ink-4">Last edited 6d ago</span>
                  <span className="text-[11.5px] text-ink-3 transition-colors group-hover:text-ink-1">
                    Open ↗
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-eyebrow text-ink-4">{label}</div>
      <div
        className="display num mt-[2px] text-[18px]"
        style={{ color: color ?? '#0a0a0a' }}
      >
        {value}
      </div>
    </div>
  );
}
