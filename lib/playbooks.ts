import type { CustomerWithHealth, Contact } from './types';

export interface PlaybookStep {
  n: number;
  label: string;
  detail: string;
}

export interface PlaybookImpact {
  metrics: Array<{ label: string; value: string; subLabel?: string }>;
  measured: string;
}

export interface ContactMatch {
  contact: Contact;
  customer: CustomerWithHealth;
  reason: string;
}

export interface Playbook {
  slug: string;
  category: string;
  title: string;
  description: string;
  trigger: string;
  steps: PlaybookStep[];
  impact: PlaybookImpact;
  match: (customers: CustomerWithHealth[], contacts: Contact[]) => ContactMatch[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    slug: 'renewal-save-play',
    category: 'Save play',
    title: 'Renewal save play',
    description:
      'Triggered when an account is within 60 days of renewal and health has dropped below 60. This playbook runs a seven-step sequence designed to reverse the risk: it opens an executive escalation channel, surfaces a save offer, and installs a weekly check-in cadence until the renewal is confirmed.\n\nWhen it fires: health < 60 AND renewal ≤ 60 days away.\n\nWhy it matters: the 60-day window is the last point at which a CSM can realistically influence a renewal decision. Accounts that enter this window without a structured response have a 3× higher churn rate than accounts where the save play is active.',
    trigger: 'Health < 60 and renewal ≤ 60 days',
    steps: [
      { n: 1, label: 'Flag account as Save Play active', detail: 'Set internal status flag and notify CS lead via Slack.' },
      { n: 2, label: 'Send executive escalation email', detail: 'Personalised email to champion acknowledging risk signals and proposing a call.' },
      { n: 3, label: 'Internal war-room notification', detail: 'Post to #cs-saves Slack channel with account health snapshot.' },
      { n: 4, label: 'Schedule discovery call', detail: 'Book within 48 hours to surface root cause of declining health.' },
      { n: 5, label: 'Log save offer and concession options', detail: 'Document which levers are available (discount, feature unlock, SLA upgrade).' },
      { n: 6, label: 'Weekly check-in cadence', detail: 'CSM-led sync every 7 days until renewal is confirmed or lost.' },
      { n: 7, label: '48h pre-renewal confirmation', detail: 'Final check-in 2 days before renewal date to confirm intent and unblock procurement.' },
    ],
    impact: {
      metrics: [
        { label: 'Renewals saved', value: '23' },
        { label: 'ARR protected', value: '€412k' },
        { label: 'Success rate', value: '47%' },
        { label: 'Health recovery', value: '+18pts', subLabel: 'avg' },
      ],
      measured:
        'A renewal is counted as "saved" when an enrolled account completes the full sequence and renews without cancellation. ARR is annualised MRR at enrollment. Health recovery is the delta between health score at step 1 and at the renewal date.',
    },
    match: (customers, contacts) => {
      const eligible = customers.filter((c) => c.churnRisk && c.daysToRenewal <= 60);
      return eligible.flatMap((c) =>
        contacts
          .filter((co) => co.customer_id === c.id)
          .slice(0, 2)
          .map((co) => ({
            contact: co,
            customer: c,
            reason: `Health ${c.health.score} · renewal in ${c.daysToRenewal}d`,
          }))
      );
    },
  },
  {
    slug: 'detractor-followup',
    category: 'Adoption',
    title: 'Detractor follow-up',
    description:
      'Activated when an account returns a negative NPS score. The sequence opens a feedback acknowledgement loop, schedules a discovery call to capture root cause, and routes a remediation plan to the relevant internal team.\n\nWhen it fires: NPS < 0.\n\nWhy it matters: NPS detractors who receive a structured follow-up within 72 hours convert to passives at 2× the rate of those who receive no outreach. Capturing root cause also feeds the product roadmap with high-signal data.',
    trigger: 'NPS < 0',
    steps: [
      { n: 1, label: 'Send NPS acknowledgement email', detail: 'Thank the contact for honest feedback and commit to follow-up within 48 hours.' },
      { n: 2, label: 'Schedule discovery call', detail: 'Book a 30-minute call within 72 hours to explore root cause.' },
      { n: 3, label: 'Log root cause and remediation plan', detail: 'Document findings in the account record and tag the relevant product area.' },
      { n: 4, label: 'Hand off to engineering or product', detail: 'Create a tracked action item with an owner and target resolution date.' },
    ],
    impact: {
      metrics: [
        { label: 'NPS recoveries', value: '31' },
        { label: 'Health recovery', value: '+22pts', subLabel: 'avg' },
        { label: 'Success rate', value: '61%' },
        { label: 'Avg response time', value: '38h' },
      ],
      measured:
        'A recovery is counted when an enrolled account\'s NPS moves from negative to ≥ 0 within 90 days of enrollment. Health recovery is the avg score delta at 90 days. Response time is measured from trigger to step 1 completion.',
    },
    match: (customers, contacts) => {
      const eligible = customers.filter((c) => c.nps < 0);
      return eligible.flatMap((c) =>
        contacts
          .filter((co) => co.customer_id === c.id)
          .slice(0, 2)
          .map((co) => ({
            contact: co,
            customer: c,
            reason: `NPS ${c.nps} · ${c.health.band === 'red' ? 'critical health' : 'at watch'}`,
          }))
      );
    },
  },
  {
    slug: 'onboarding-kickoff',
    category: 'Onboarding',
    title: 'Onboarding kickoff',
    description:
      'A nine-step onboarding sequence for accounts created within the last 30 days. Covers workspace setup, integration mapping, champion enablement, and a 60-day milestone review. Designed to get accounts to first value within 24 days.\n\nWhen it fires: account created within 30 days.\n\nWhy it matters: accounts that complete structured onboarding within the first 30 days have a 94% 12-month retention rate vs 71% for accounts that self-onboard.',
    trigger: 'Account created within 30 days',
    steps: [
      { n: 1, label: 'Send welcome email and workspace setup guide', detail: 'Personalised welcome with a step-by-step setup checklist.' },
      { n: 2, label: 'Schedule kickoff call', detail: 'Book within 3 business days of account creation.' },
      { n: 3, label: 'Integration mapping session', detail: 'Map the account\'s existing tools to available integrations.' },
      { n: 4, label: 'Champion enablement session', detail: '45-minute live walkthrough with the primary champion.' },
      { n: 5, label: 'Week 2 check-in', detail: 'Quick async check-in to unblock any setup friction.' },
      { n: 6, label: 'Week 3 product walkthrough', detail: 'Deep-dive into the features most relevant to the account\'s use case.' },
      { n: 7, label: '30-day milestone review', detail: 'Review setup completion and first-value indicators.' },
      { n: 8, label: '45-day adoption health check', detail: 'Review usage data and flag any underutilised features.' },
      { n: 9, label: '60-day success review', detail: 'Formal review of onboarding outcomes and next-90-day plan.' },
    ],
    impact: {
      metrics: [
        { label: 'Time to first value', value: '24d', subLabel: 'avg' },
        { label: '90-day retention', value: '94%' },
        { label: 'Setup completion', value: '89%' },
        { label: 'NPS at 60d', value: '+31', subLabel: 'avg' },
      ],
      measured:
        'Time to first value is measured from account creation to first meaningful usage event. Retention is 90-day survival rate for enrolled accounts. Setup completion tracks checklist items completed by day 30.',
    },
    match: (customers, contacts) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const eligible = customers.filter((c) => c.created_at > thirtyDaysAgo);
      return eligible.flatMap((c) =>
        contacts
          .filter((co) => co.customer_id === c.id)
          .slice(0, 1)
          .map((co) => ({
            contact: co,
            customer: c,
            reason: `New account · created ${Math.round((Date.now() - new Date(c.created_at).getTime()) / 86400000)}d ago`,
          }))
      );
    },
  },
  {
    slug: 'power-user-expansion',
    category: 'Expansion',
    title: 'Power user expansion',
    description:
      'Fires when an account is using ≥ 85% of their plan capacity with a healthy score. The sequence surfaces the upsell signal, schedules an expansion conversation, prepares a proposal, and routes the opportunity to the AE.\n\nWhen it fires: usage ≥ 85% AND health ≥ 70.\n\nWhy it matters: expansion conversations initiated from a usage signal convert at 38% — nearly 2× the rate of time-based outreach. The account is already getting value; this playbook turns that signal into a revenue conversation.',
    trigger: 'Usage ≥ 85% and health ≥ 70',
    steps: [
      { n: 1, label: 'Log upsell signal in account record', detail: 'Document current usage % and the plan limit being approached.' },
      { n: 2, label: 'Send usage milestone notification', detail: 'Email to champion acknowledging their growth and surfacing expansion options.' },
      { n: 3, label: 'Schedule expansion conversation', detail: 'Book a 30-minute call to explore scope and timeline.' },
      { n: 4, label: 'Prepare expansion proposal', detail: 'Draft proposal with pricing, new limits, and expected outcomes.' },
      { n: 5, label: 'Route to AE for close', detail: 'Hand off opportunity with full context for commercial close.' },
    ],
    impact: {
      metrics: [
        { label: 'Expansion conversations', value: '18' },
        { label: 'ARR added', value: '€189k' },
        { label: 'Conversion rate', value: '38%' },
        { label: 'Avg deal size', value: '€10.5k' },
      ],
      measured:
        'An expansion is counted when an enrolled account upgrades their plan within 90 days. ARR added is the delta in annualised MRR. Conversion rate is expansions / expansion conversations initiated.',
    },
    match: (customers, contacts) => {
      const eligible = customers.filter((c) => c.usage >= 85 && c.health.score >= 70);
      return eligible.flatMap((c) =>
        contacts
          .filter((co) => co.customer_id === c.id)
          .slice(0, 2)
          .map((co) => ({
            contact: co,
            customer: c,
            reason: `Usage ${c.usage}% · health ${c.health.score}`,
          }))
      );
    },
  },
  {
    slug: 'quarterly-business-review',
    category: 'Adoption',
    title: 'Quarterly business review',
    description:
      'A structured QBR sequence for Enterprise accounts, auto-scheduling 14 days before each quarter end. Covers outcome review, roadmap alignment, and a renewal preview.\n\nWhen it fires: Enterprise tier · quarterly cadence.\n\nWhy it matters: Enterprise accounts that participate in structured QBRs renew at 91% vs 74% for those without. The QBR is also the highest-leverage moment to surface expansion intent.',
    trigger: 'Enterprise tier · quarterly cadence',
    steps: [
      { n: 1, label: 'Auto-schedule QBR 14 days before quarter end', detail: 'Send calendar invite to champion and key stakeholders.' },
      { n: 2, label: 'Send QBR agenda template', detail: 'Pre-populated agenda with outcome metrics and discussion topics.' },
      { n: 3, label: 'Prepare outcome review deck', detail: 'Pull usage data, health trend, and support summary into QBR slide deck.' },
      { n: 4, label: 'Run QBR session', detail: '60-minute structured review with champion and exec sponsor.' },
      { n: 5, label: 'Log action items and commitments', detail: 'Document all commitments with owners and dates in the account record.' },
      { n: 6, label: 'Send follow-up summary', detail: 'Email recap with action items, timeline, and next QBR date.' },
    ],
    impact: {
      metrics: [
        { label: 'Expansion intent flagged', value: '9' },
        { label: 'Renewal confidence', value: '7.4/10', subLabel: 'avg' },
        { label: 'QBR completion rate', value: '83%' },
        { label: 'NPS lift at 30d', value: '+11pts' },
      ],
      measured:
        'Expansion intent is flagged by CSM during the QBR session. Renewal confidence is self-reported by the champion on a 1–10 scale. NPS lift is the delta 30 days post-QBR vs the score at QBR date.',
    },
    match: (customers, contacts) => {
      const eligible = customers.filter((c) => c.tier === 'Enterprise');
      return eligible.flatMap((c) =>
        contacts
          .filter((co) => co.customer_id === c.id)
          .slice(0, 2)
          .map((co) => ({
            contact: co,
            customer: c,
            reason: `Enterprise · ${c.daysToRenewal}d to renewal`,
          }))
      );
    },
  },
  {
    slug: 'critical-health-intervention',
    category: 'Risk',
    title: 'Critical health intervention',
    description:
      'Immediate response when an account\'s health score drops into the critical band (< 40). The sequence escalates internally, triages the support backlog, validates champion engagement, and surfaces blockers to leadership within 24 hours.\n\nWhen it fires: health < 40.\n\nWhy it matters: accounts that receive structured intervention within 7 days of entering the red band recover at 2× the rate of accounts where response is delayed. Speed is the differentiator.',
    trigger: 'Health < 40',
    steps: [
      { n: 1, label: 'Internal escalation to CS lead', detail: 'Immediate Slack alert with health snapshot and recommended first action.' },
      { n: 2, label: 'Triage support ticket backlog', detail: 'Review and prioritise all open tickets; escalate blockers to engineering.' },
      { n: 3, label: 'Validate champion engagement', detail: 'Confirm champion is still active and receptive; flag if champion risk detected.' },
      { n: 4, label: 'Schedule emergency sync', detail: 'Book a call within 24 hours of trigger to surface immediate blockers.' },
      { n: 5, label: 'Surface blockers to leadership', detail: 'Present account status and recovery plan at next CS leadership review.' },
    ],
    impact: {
      metrics: [
        { label: 'Accounts recovered', value: '14' },
        { label: 'Avg recovery time', value: '31d' },
        { label: 'Recovery rate', value: '52%' },
        { label: 'Health recovery', value: '+29pts', subLabel: 'avg' },
      ],
      measured:
        'Recovery is counted when an account exits the red band (health ≥ 40) within 90 days of enrollment. Recovery time is the median days from trigger to first green or amber reading. Health recovery is the avg score delta at 90 days.',
    },
    match: (customers, contacts) => {
      const eligible = customers.filter((c) => c.health.band === 'red');
      return eligible.flatMap((c) =>
        contacts
          .filter((co) => co.customer_id === c.id)
          .slice(0, 2)
          .map((co) => ({
            contact: co,
            customer: c,
            reason: `Health ${c.health.score} · ${c.open_tickets} open tickets`,
          }))
      );
    },
  },
];

export function getPlaybook(slug: string): Playbook | null {
  return PLAYBOOKS.find((p) => p.slug === slug) ?? null;
}
