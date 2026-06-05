export type PlanTier = 'Starter' | 'Pro' | 'Enterprise';

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'system';

export interface Customer {
  id: string;
  name: string;
  tier: PlanTier;
  mrr: number;
  renewal_date: string; // ISO date
  csm: string;
  nps: number; // -100..100
  usage: number; // 0..100
  open_tickets: number;
  created_at: string; // ISO
  alerted_at: string | null; // ISO or null
}

export interface Contact {
  id: string;
  customer_id: string;
  name: string;
  role: string;
  email: string;
}

export interface Activity {
  id: string;
  customer_id: string;
  type: ActivityType;
  text: string;
  author: string;
  timestamp: string; // ISO
}

export type HealthBand = 'green' | 'amber' | 'red';

export interface HealthBreakdown {
  score: number;
  band: HealthBand;
  usageComponent: number;
  ticketsComponent: number;
  npsComponent: number;
}

export interface CustomerWithHealth extends Customer {
  health: HealthBreakdown;
  churnRisk: boolean;
  daysToRenewal: number;
}
