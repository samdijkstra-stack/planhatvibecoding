import type { CustomerWithHealth, MetricSnapshot } from './types';
import { W_USAGE, W_TICKETS, W_NPS, TICKET_SATURATION } from './health';

export type SignalTone = 'positive' | 'neutral' | 'negative';

export interface AxisDriver {
  axis: 'Usage' | 'Support load' | 'NPS';
  weightPct: number;
  contributionPts: number; // points contributed to the 0–100 score
  maxPts: number; // max this axis can contribute
  tone: SignalTone;
  signal: string; // concrete, data-grounded explanation
}

export interface HealthExplanation {
  summary: string;
  drivers: AxisDriver[];
  trend: { deltaHealth: number; note: string } | null;
}

function tone(pct: number): SignalTone {
  if (pct >= 0.75) return 'positive';
  if (pct >= 0.5) return 'neutral';
  return 'negative';
}

export function explainHealth(
  c: CustomerWithHealth,
  history?: MetricSnapshot[]
): HealthExplanation {
  const usagePct = Math.max(0, Math.min(1, c.usage / 100));
  const ticketsPct = Math.max(0, Math.min(1, 1 - c.open_tickets / TICKET_SATURATION));
  const npsPct = Math.max(0, Math.min(1, (c.nps + 100) / 200));

  const drivers: AxisDriver[] = [
    {
      axis: 'Usage',
      weightPct: Math.round(W_USAGE * 100),
      contributionPts: c.health.usageComponent,
      maxPts: Math.round(W_USAGE * 100),
      tone: tone(usagePct),
      signal:
        c.usage >= 85
          ? `Active usage at ${c.usage}% — well above the healthy threshold.`
          : c.usage >= 65
          ? `Active usage at ${c.usage}% — solid but with room to grow.`
          : c.usage >= 40
          ? `Active usage at ${c.usage}% — below the 65% healthy mark; adoption is slipping.`
          : `Active usage at ${c.usage}% — critically low; the platform is barely being used.`,
    },
    {
      axis: 'Support load',
      weightPct: Math.round(W_TICKETS * 100),
      contributionPts: c.health.ticketsComponent,
      maxPts: Math.round(W_TICKETS * 100),
      tone: tone(ticketsPct),
      signal:
        c.open_tickets === 0
          ? `Zero open tickets — a clean support queue.`
          : c.open_tickets <= 3
          ? `${c.open_tickets} open ticket${c.open_tickets === 1 ? '' : 's'} — well within normal range.`
          : c.open_tickets <= 6
          ? `${c.open_tickets} open tickets — elevated support load weighing on the score.`
          : `${c.open_tickets} open tickets — approaching the ${TICKET_SATURATION}-ticket saturation point; this is a major drag.`,
    },
    {
      axis: 'NPS',
      weightPct: Math.round(W_NPS * 100),
      contributionPts: c.health.npsComponent,
      maxPts: Math.round(W_NPS * 100),
      tone: tone(npsPct),
      signal:
        c.nps >= 30
          ? `NPS ${c.nps >= 0 ? '+' : ''}${c.nps} — a promoter relationship.`
          : c.nps >= 0
          ? `NPS ${c.nps >= 0 ? '+' : ''}${c.nps} — passive; sentiment is lukewarm.`
          : c.nps >= -30
          ? `NPS ${c.nps} — a detractor signal that needs follow-up.`
          : `NPS ${c.nps} — a strong detractor; a leading churn indicator.`,
    },
  ];

  // Identify the biggest drag (lowest fill ratio among axes)
  const ranked = [...drivers].sort(
    (a, b) => a.contributionPts / a.maxPts - b.contributionPts / b.maxPts
  );
  const worst = ranked[0];
  const best = ranked[ranked.length - 1];

  const bandWord =
    c.health.band === 'green' ? 'healthy' : c.health.band === 'amber' ? 'at-watch' : 'critical';

  let summary: string;
  if (c.health.band === 'green') {
    summary = `Score is ${bandWord} (${c.health.score}), carried by ${best.axis.toLowerCase()}. ${worst.axis} is the softest axis but not yet a concern.`;
  } else {
    summary = `Score is ${bandWord} (${c.health.score}), dragged down mainly by ${worst.axis.toLowerCase()}. ${worst.signal}`;
  }

  // Trend from history (compare oldest to current)
  let trend: HealthExplanation['trend'] = null;
  if (history && history.length >= 2) {
    const first = history[0].health;
    const last = history[history.length - 1].health;
    const delta = last - first;
    const weeks = history.length;
    trend = {
      deltaHealth: delta,
      note:
        delta <= -10
          ? `Down ${Math.abs(delta)} points over the last ${weeks} weeks — a clear downward trajectory.`
          : delta < 0
          ? `Down ${Math.abs(delta)} points over ${weeks} weeks — gradually softening.`
          : delta === 0
          ? `Flat over the last ${weeks} weeks.`
          : delta < 10
          ? `Up ${delta} points over ${weeks} weeks — slowly improving.`
          : `Up ${delta} points over ${weeks} weeks — strong recovery.`,
    };
  }

  return { summary, drivers, trend };
}
