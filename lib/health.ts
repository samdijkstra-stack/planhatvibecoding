import type { Customer, HealthBand, HealthBreakdown } from './types';

// Weights — tweak here. Must sum to 1.
export const W_USAGE = 0.5;
export const W_TICKETS = 0.25;
export const W_NPS = 0.25;

// A ticket count at or above this maps to 0 on the tickets axis.
export const TICKET_SATURATION = 10;

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Pure health-score computation.
 * Returns score 0–100, the band, and each weighted component for display.
 */
export function computeHealth(input: Pick<Customer, 'usage' | 'open_tickets' | 'nps'>): HealthBreakdown {
  const usageNorm = clamp(input.usage, 0, 100); // already 0..100
  const ticketsNorm = clamp(100 - (input.open_tickets / TICKET_SATURATION) * 100, 0, 100);
  const npsNorm = clamp(((input.nps + 100) / 200) * 100, 0, 100); // -100..100 -> 0..100

  const usageComponent = usageNorm * W_USAGE;
  const ticketsComponent = ticketsNorm * W_TICKETS;
  const npsComponent = npsNorm * W_NPS;

  const score = Math.round(usageComponent + ticketsComponent + npsComponent);
  const band: HealthBand = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red';

  return {
    score,
    band,
    usageComponent: Math.round(usageComponent * 10) / 10,
    ticketsComponent: Math.round(ticketsComponent * 10) / 10,
    npsComponent: Math.round(npsComponent * 10) / 10,
  };
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO).getTime();
  const b = new Date(toISO).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function isChurnRisk(score: number, daysToRenewal: number): boolean {
  if (score < 40) return true;
  if (daysToRenewal <= 60 && daysToRenewal >= 0 && score < 60) return true;
  return false;
}
