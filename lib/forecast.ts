import type { CustomerWithHealth } from './types';

// Forecast horizon — accounts renewing within this window form the renewal base.
export const FORECAST_HORIZON_DAYS = 120;

// Hardcoded targets per CSM (seed-only, per the demo decision).
// grr / nrr are retention ratios; newAcv is annual expansion/new revenue in EUR.
export interface CsmTarget {
  grr: number;
  nrr: number;
  newAcv: number;
}

export const TARGETS: Record<string, CsmTarget> = {
  'Sam Dijkstra': { grr: 0.9, nrr: 1.12, newAcv: 180000 },
  'Lina Carlsson': { grr: 0.9, nrr: 1.1, newAcv: 120000 },
  'Daniel Park': { grr: 0.88, nrr: 1.08, newAcv: 120000 },
  'Maya Lopez': { grr: 0.92, nrr: 1.05, newAcv: 60000 },
};

// Whole-team target = sum of individual targets (newAcv) and account-weighted retention.
export const TEAM_TARGET: CsmTarget = {
  grr: 0.9,
  nrr: 1.1,
  newAcv: Object.values(TARGETS).reduce((s, t) => s + t.newAcv, 0),
};

// Map health band → base renewal probability, nudged by urgency.
export function renewalLikelihood(c: CustomerWithHealth): number {
  let p = c.health.band === 'green' ? 0.95 : c.health.band === 'amber' ? 0.7 : 0.35;
  // Churn-risk accounts close to renewal are more precarious.
  if (c.churnRisk && c.daysToRenewal <= 30) p -= 0.1;
  // A long runway gives more room to recover.
  if (c.daysToRenewal > 90 && c.health.band === 'red') p += 0.05;
  return Math.max(0.05, Math.min(0.98, p));
}

// Expansion upside: high-usage healthy accounts can grow ARR.
function expansionPotentialArr(c: CustomerWithHealth): number {
  const arr = c.mrr * 12;
  if (c.usage >= 85 && c.health.score >= 70) return arr * 0.2;
  if (c.usage >= 75 && c.health.band !== 'red') return arr * 0.1;
  return 0;
}

export type Lever = 'save-play' | 'expansion' | 'triage' | 'detractor' | 'none';

export interface ForecastAccount {
  customer: CustomerWithHealth;
  arr: number;
  likelihood: number;
  expectedArr: number; // arr * likelihood
  bestArr: number; // arr * (likelihood + 0.2)
  worstArr: number; // arr * (likelihood - 0.2)
  swing: number; // bestArr - worstArr
  expansionArr: number;
  recoverableArr: number; // arr * (1 - likelihood) — what action could win back
  lever: Lever;
  leverLabel: string;
  playbookSlug?: string;
}

export interface Forecast {
  scope: 'mine' | 'all';
  csm: string;
  target: CsmTarget;
  renewalBaseArr: number;
  committedArr: number; // expected retained
  bestCaseArr: number;
  worstCaseArr: number;
  expectedExpansionArr: number;
  grrForecast: number; // committed / base
  nrrForecast: number; // (committed + expansion) / base
  newAcvForecast: number; // expected expansion
  grrGap: number; // forecast - target (ratio)
  nrrGap: number;
  newAcvGap: number; // forecast - target (EUR)
  accounts: ForecastAccount[]; // all renewing accounts in horizon
  swingCases: ForecastAccount[]; // ranked by swing desc
  impactCases: ForecastAccount[]; // ranked by recoverable ARR desc (actionable)
  renewingCount: number;
}

function leverFor(c: CustomerWithHealth): { lever: Lever; label: string; slug?: string } {
  if (c.churnRisk && c.daysToRenewal <= 60) {
    return { lever: 'save-play', label: 'Run Renewal Save Play', slug: 'renewal-save-play' };
  }
  if (c.health.band === 'red') {
    return {
      lever: 'triage',
      label: 'Critical Health Intervention',
      slug: 'critical-health-intervention',
    };
  }
  if (c.nps < 0) {
    return { lever: 'detractor', label: 'Detractor Follow-up', slug: 'detractor-followup' };
  }
  if (c.usage >= 85 && c.health.score >= 70) {
    return { lever: 'expansion', label: 'Power User Expansion', slug: 'power-user-expansion' };
  }
  return { lever: 'none', label: 'Maintain cadence' };
}

export function computeForecast(
  allCustomers: CustomerWithHealth[],
  scope: 'mine' | 'all',
  csmName: string
): Forecast {
  const pool =
    scope === 'mine' ? allCustomers.filter((c) => c.csm === csmName) : allCustomers;
  const target = scope === 'mine' ? TARGETS[csmName] ?? TEAM_TARGET : TEAM_TARGET;

  const renewing = pool.filter(
    (c) => c.daysToRenewal >= 0 && c.daysToRenewal <= FORECAST_HORIZON_DAYS
  );

  const accounts: ForecastAccount[] = renewing.map((c) => {
    const arr = c.mrr * 12;
    const likelihood = renewalLikelihood(c);
    const expectedArr = arr * likelihood;
    const bestArr = arr * Math.min(0.98, likelihood + 0.2);
    const worstArr = arr * Math.max(0.05, likelihood - 0.2);
    const expansionArr = expansionPotentialArr(c);
    const lev = leverFor(c);
    return {
      customer: c,
      arr,
      likelihood,
      expectedArr,
      bestArr,
      worstArr,
      swing: bestArr - worstArr,
      expansionArr,
      recoverableArr: arr * (1 - likelihood),
      lever: lev.lever,
      leverLabel: lev.label,
      playbookSlug: lev.slug,
    };
  });

  const renewalBaseArr = accounts.reduce((s, a) => s + a.arr, 0);
  const committedArr = accounts.reduce((s, a) => s + a.expectedArr, 0);
  const bestCaseArr = accounts.reduce((s, a) => s + a.bestArr, 0);
  const worstCaseArr = accounts.reduce((s, a) => s + a.worstArr, 0);

  // Expansion across the whole pool (not just renewing) — probability-weighted.
  const expectedExpansionArr = pool.reduce((s, c) => {
    const pot = expansionPotentialArr(c);
    if (pot === 0) return s;
    const conv = c.health.band === 'green' ? 0.4 : 0.2;
    return s + pot * conv;
  }, 0);

  const grrForecast = renewalBaseArr === 0 ? 1 : Math.min(1, committedArr / renewalBaseArr);
  const nrrForecast =
    renewalBaseArr === 0 ? 1 : (committedArr + expectedExpansionArr) / renewalBaseArr;

  const swingCases = [...accounts].sort((a, b) => b.swing - a.swing).slice(0, 6);
  const impactCases = [...accounts]
    .filter((a) => a.lever !== 'none' && a.recoverableArr > 0)
    .sort((a, b) => b.recoverableArr - a.recoverableArr)
    .slice(0, 6);

  return {
    scope,
    csm: csmName,
    target,
    renewalBaseArr,
    committedArr,
    bestCaseArr,
    worstCaseArr,
    expectedExpansionArr,
    grrForecast,
    nrrForecast,
    newAcvForecast: expectedExpansionArr,
    grrGap: grrForecast - target.grr,
    nrrGap: nrrForecast - target.nrr,
    newAcvGap: expectedExpansionArr - target.newAcv,
    accounts,
    swingCases,
    impactCases,
    renewingCount: renewing.length,
  };
}
