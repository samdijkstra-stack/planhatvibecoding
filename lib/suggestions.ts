import type { CustomerWithHealth } from './types';
import { TICKET_SATURATION } from './health';

export type SuggestionPriority = 'critical' | 'warning' | 'positive';

export interface Suggestion {
  priority: SuggestionPriority;
  action: string;
  detail: string;
  playbookSlug?: string;
  playbookLabel?: string;
}

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
};

export function getHealthSuggestions(c: CustomerWithHealth): Suggestion[] {
  const s: Suggestion[] = [];

  // ── Renewal + churn risk ──────────────────────────────────────────────────
  if (c.churnRisk && c.daysToRenewal <= 30) {
    s.push({
      priority: 'critical',
      action: `Activate Renewal Save Play now — renewal in ${c.daysToRenewal}d`,
      detail: `This is the final window to influence the renewal. Executive escalation email and weekly check-in cadence should start today.`,
      playbookSlug: 'renewal-save-play',
      playbookLabel: 'Open Save Play',
    });
  } else if (c.churnRisk && c.daysToRenewal <= 60) {
    s.push({
      priority: 'critical',
      action: `Start Renewal Save Play — ${c.daysToRenewal}d to renewal, health ${c.health.score}`,
      detail: `Health is below 60 with renewal approaching. The seven-step save sequence should be running.`,
      playbookSlug: 'renewal-save-play',
      playbookLabel: 'Open Save Play',
    });
  } else if (!c.churnRisk && c.daysToRenewal <= 60) {
    s.push({
      priority: 'warning',
      action: `Schedule renewal review — ${c.daysToRenewal}d to renewal`,
      detail: `Confirm intent, surface blockers, and update internal forecast before the 30-day mark.`,
    });
  }

  // ── NPS ───────────────────────────────────────────────────────────────────
  if (c.nps <= -30) {
    s.push({
      priority: 'critical',
      action: `Run Detractor Follow-up — NPS ${c.nps} is a strong churn signal`,
      detail: `Discovery call within 72 hours to capture root cause. Accounts at this NPS with no follow-up churn at 3× the rate.`,
      playbookSlug: 'detractor-followup',
      playbookLabel: 'Open Playbook',
    });
  } else if (c.nps < 0) {
    s.push({
      priority: 'warning',
      action: `Acknowledge negative NPS — enroll in Detractor Follow-up`,
      detail: `NPS ${c.nps}. Send the feedback acknowledgement email and schedule a 30-minute discovery call.`,
      playbookSlug: 'detractor-followup',
      playbookLabel: 'Open Playbook',
    });
  }

  // ── Tickets ───────────────────────────────────────────────────────────────
  if (c.open_tickets >= 7) {
    s.push({
      priority: 'critical',
      action: `Triage ${c.open_tickets} open tickets — support load near saturation`,
      detail: `${c.open_tickets} tickets approaches the ${TICKET_SATURATION}-ticket saturation point. Escalate blockers to engineering and run a live triage call this week.`,
    });
  } else if (c.open_tickets >= 4) {
    s.push({
      priority: 'warning',
      action: `Schedule ticket triage — ${c.open_tickets} open tickets`,
      detail: `A 30-minute triage call to prioritise and close the backlog will improve health score and reduce churn signal.`,
    });
  } else if (c.open_tickets === 0) {
    s.push({
      priority: 'positive',
      action: `Zero open tickets — excellent support signal`,
      detail: `Mention this in your next check-in. A clean queue at renewal time is a strong retention indicator.`,
    });
  }

  // ── Usage ─────────────────────────────────────────────────────────────────
  if (c.usage < 40) {
    s.push({
      priority: 'critical',
      action: `Urgently address low usage — ${c.usage}% is critically low`,
      detail: `Platform adoption has stalled. Schedule a champion enablement session and use-case mapping call this week.`,
    });
  } else if (c.usage < 65) {
    s.push({
      priority: 'warning',
      action: `Recover usage with an enablement session — ${c.usage}%`,
      detail: `Review which features are underutilised. A targeted 45-minute walkthrough typically recovers 15–20 usage points.`,
    });
  } else if (c.usage >= 85 && c.health.score >= 70) {
    s.push({
      priority: 'positive',
      action: `Usage at ${c.usage}% — strong expansion signal`,
      detail: `Approaching plan limits with a healthy score. The Power User Expansion playbook converts this signal at 38%.`,
      playbookSlug: 'power-user-expansion',
      playbookLabel: 'Open Expansion Play',
    });
  }

  // ── Critical health catch-all ─────────────────────────────────────────────
  const hasCritical = s.some((x) => x.priority === 'critical');
  if (c.health.band === 'red' && !hasCritical) {
    s.push({
      priority: 'critical',
      action: `Activate Critical Health Intervention — health ${c.health.score}`,
      detail: `Internal escalation and emergency sync with the champion should happen this week.`,
      playbookSlug: 'critical-health-intervention',
      playbookLabel: 'Open Playbook',
    });
  }

  return s.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
