import type { CustomerWithHealth } from './types';

export type CalEventType = 'renewal' | 'save-play' | 'qbr' | 'check-in';

export interface CalEvent {
  id: string;
  date: Date;
  type: CalEventType;
  customer: CustomerWithHealth;
}

export const EVENT_META: Record<CalEventType, { label: string; color: string; bg: string }> = {
  renewal: { label: 'Renewal', color: '#f06a2a', bg: '#fde8dd' },
  'save-play': { label: 'Save play', color: '#c4521e', bg: '#fde8dd' },
  qbr: { label: 'QBR', color: '#2a9c5e', bg: '#e1f3e8' },
  'check-in': { label: 'Check-in', color: '#3b82f6', bg: '#e5efff' },
};

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function deriveEvents(customers: CustomerWithHealth[], horizonDays = 90): CalEvent[] {
  const now = new Date();
  const horizon = addDays(now, horizonDays);
  const events: CalEvent[] = [];

  customers.forEach((c, index) => {
    const renewalDate = new Date(c.renewal_date);

    if (renewalDate >= now && renewalDate <= horizon) {
      events.push({ id: `${c.id}_renewal`, date: renewalDate, type: 'renewal', customer: c });
    }

    if (c.churnRisk && c.daysToRenewal <= 60) {
      const saveDate =
        renewalDate > addDays(now, 10) ? addDays(renewalDate, -10) : addDays(now, 2);
      if (saveDate >= now && saveDate <= horizon) {
        events.push({ id: `${c.id}_save`, date: saveDate, type: 'save-play', customer: c });
      }
    }

    if (c.tier === 'Enterprise' && renewalDate >= now && renewalDate <= horizon) {
      const qbrDate = addDays(renewalDate, -14);
      if (qbrDate >= now && qbrDate <= horizon) {
        events.push({ id: `${c.id}_qbr`, date: qbrDate, type: 'qbr', customer: c });
      }
    }

    if (c.health.band === 'red' && c.daysToRenewal > 60) {
      const checkIn = addDays(now, 7 + (index % 14));
      if (checkIn <= horizon) {
        events.push({ id: `${c.id}_checkin`, date: checkIn, type: 'check-in', customer: c });
      }
    }
  });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function startOfMonday(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
