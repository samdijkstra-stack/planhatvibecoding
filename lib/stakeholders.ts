import type { Contact, StakeholderInfluence, StakeholderSentiment } from './types';

export const SENTIMENT_META: Record<
  StakeholderSentiment,
  { label: string; color: string; bg: string; rank: number }
> = {
  champion: { label: 'Champion', color: '#2a9c5e', bg: '#e1f3e8', rank: 2 },
  supporter: { label: 'Supporter', color: '#3b82f6', bg: '#e5efff', rank: 1 },
  neutral: { label: 'Neutral', color: '#8a8a8a', bg: '#f4f4f4', rank: 0 },
  detractor: { label: 'Detractor', color: '#d97706', bg: '#fcecd9', rank: -1 },
  blocker: { label: 'Blocker', color: '#f06a2a', bg: '#fde8dd', rank: -2 },
};

export const INFLUENCE_META: Record<
  StakeholderInfluence,
  { label: string; weight: number }
> = {
  high: { label: 'High influence', weight: 3 },
  medium: { label: 'Medium influence', weight: 2 },
  low: { label: 'Low influence', weight: 1 },
};

export interface StakeholderHealth {
  hasChampion: boolean;
  hasHighInfluenceBlocker: boolean;
  coverageNote: string;
  riskNote: string | null;
}

// Assess the relationship map for an account: do we have a senior champion?
// Is there a high-influence detractor/blocker undermining the renewal?
export function assessStakeholders(contacts: Contact[]): StakeholderHealth {
  const champions = contacts.filter(
    (c) => c.sentiment === 'champion' && c.influence !== 'low'
  );
  const blockers = contacts.filter(
    (c) =>
      (c.sentiment === 'blocker' || c.sentiment === 'detractor') && c.influence === 'high'
  );
  const hasChampion = champions.length > 0;
  const hasHighInfluenceBlocker = blockers.length > 0;

  const coverageNote = hasChampion
    ? `${champions.length} senior champion${champions.length === 1 ? '' : 's'} engaged.`
    : 'No senior champion identified — single-threaded risk.';

  let riskNote: string | null = null;
  if (hasHighInfluenceBlocker) {
    riskNote = `${blockers[0].name} (${blockers[0].role}) is a high-influence ${blockers[0].sentiment} — address directly before renewal.`;
  } else if (!hasChampion) {
    riskNote = 'No high-influence advocate — the relationship is exposed if your main contact leaves.';
  }

  return { hasChampion, hasHighInfluenceBlocker, coverageNote, riskNote };
}
