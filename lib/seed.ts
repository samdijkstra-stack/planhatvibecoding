import type { Client } from '@libsql/client';
import type { ActivityType, PlanTier } from './types';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function id(prefix: string, n: number) {
  return `${prefix}_${String(n).padStart(3, '0')}`;
}

interface SeedCustomer {
  name: string;
  tier: PlanTier;
  mrr: number;
  renewalDays: number;
  csm: string;
  nps: number;
  usage: number;
  open_tickets: number;
  createdDaysAgo: number;
  contacts: Array<{ name: string; role: string; email: string }>;
  activities: Array<{ type: ActivityType; text: string; author: string; daysAgo: number }>;
}

// Engineered distribution: 8 green / 6 amber / 4 red.
// At least 3 churn-risk via "renewal <= 60d AND health < 60" (Mediterraneo, Hanseatic, Albatross).
const SEED: SeedCustomer[] = [
  // ===== GREEN (8) =====
  {
    name: 'Acme Logistics',
    tier: 'Enterprise',
    mrr: 18400,
    renewalDays: 280,
    csm: 'Sam Dijkstra',
    nps: 65,
    usage: 92,
    open_tickets: 1,
    createdDaysAgo: 720,
    contacts: [
      { name: 'Eva Lindgren', role: 'VP Operations', email: 'eva@acmelogistics.com' },
      { name: 'Tomás Ferreira', role: 'Logistics Lead', email: 'tomas@acmelogistics.com' },
      { name: 'Priya Shah', role: 'Procurement', email: 'priya@acmelogistics.com' },
    ],
    activities: [
      { type: 'meeting', text: 'QBR — expansion into APAC discussed, strong fit.', author: 'Sam Dijkstra', daysAgo: 4 },
      { type: 'email', text: 'Sent updated roadmap deck after QBR.', author: 'Sam Dijkstra', daysAgo: 3 },
      { type: 'call', text: 'Tomás aligned on Q3 rollout plan for new warehouses.', author: 'Sam Dijkstra', daysAgo: 17 },
      { type: 'note', text: 'Champion: Eva. Considering 2 additional seats next quarter.', author: 'Sam Dijkstra', daysAgo: 33 },
      { type: 'system', text: 'Monthly usage exceeded plan benchmark by 18%.', author: 'system', daysAgo: 5 },
    ],
  },
  {
    name: 'NordTrend Retail',
    tier: 'Pro',
    mrr: 4200,
    renewalDays: 210,
    csm: 'Lina Carlsson',
    nps: 55,
    usage: 85,
    open_tickets: 2,
    createdDaysAgo: 540,
    contacts: [
      { name: 'Henrik Olsen', role: 'Head of Digital', email: 'henrik@nordtrend.se' },
      { name: 'Saga Bergström', role: 'Ops Manager', email: 'saga@nordtrend.se' },
    ],
    activities: [
      { type: 'call', text: 'Walkthrough of new analytics module — well received.', author: 'Lina Carlsson', daysAgo: 6 },
      { type: 'email', text: 'Saga requested onboarding session for 3 new hires.', author: 'Saga Bergström', daysAgo: 12 },
      { type: 'meeting', text: 'Monthly sync — focus on holiday-season readiness.', author: 'Lina Carlsson', daysAgo: 28 },
      { type: 'note', text: 'Henrik mentioned positive board review of platform ROI.', author: 'Lina Carlsson', daysAgo: 41 },
    ],
  },
  {
    name: 'Helsinki Health',
    tier: 'Pro',
    mrr: 5600,
    renewalDays: 165,
    csm: 'Sam Dijkstra',
    nps: 50,
    usage: 88,
    open_tickets: 0,
    createdDaysAgo: 400,
    contacts: [
      { name: 'Aino Virtanen', role: 'Director of Patient Ops', email: 'aino@helsinkihealth.fi' },
      { name: 'Mikael Korhonen', role: 'IT Lead', email: 'mikael@helsinkihealth.fi' },
      { name: 'Elina Mäkinen', role: 'Clinic Manager', email: 'elina@helsinkihealth.fi' },
    ],
    activities: [
      { type: 'meeting', text: 'Renewal alignment — Aino confirmed expansion intent.', author: 'Sam Dijkstra', daysAgo: 9 },
      { type: 'email', text: 'Shared HIPAA documentation update for procurement.', author: 'Sam Dijkstra', daysAgo: 21 },
      { type: 'note', text: 'NPS jumped after Q1 release — feedback loop working.', author: 'Sam Dijkstra', daysAgo: 36 },
      { type: 'call', text: 'Discussed integration with their EMR vendor.', author: 'Sam Dijkstra', daysAgo: 55 },
      { type: 'system', text: 'Zero open tickets for 30 consecutive days.', author: 'system', daysAgo: 2 },
    ],
  },
  {
    name: 'Pacific Robotics',
    tier: 'Enterprise',
    mrr: 22500,
    renewalDays: 360,
    csm: 'Daniel Park',
    nps: 60,
    usage: 80,
    open_tickets: 3,
    createdDaysAgo: 900,
    contacts: [
      { name: 'Lia Tanaka', role: 'CTO', email: 'lia@pacrobotics.com' },
      { name: 'Marcus Lee', role: 'Platform Lead', email: 'marcus@pacrobotics.com' },
      { name: 'Sofia Romero', role: 'Customer Ops', email: 'sofia@pacrobotics.com' },
      { name: 'Rohan Mehta', role: 'Engineering Manager', email: 'rohan@pacrobotics.com' },
    ],
    activities: [
      { type: 'meeting', text: 'Strategic review — Lia confirmed multi-year intent.', author: 'Daniel Park', daysAgo: 14 },
      { type: 'note', text: 'Tickets up slightly post-release; team triaging.', author: 'Daniel Park', daysAgo: 8 },
      { type: 'call', text: 'Marcus walked through their internal automation roadmap.', author: 'Daniel Park', daysAgo: 32 },
      { type: 'email', text: 'Sent expansion pricing for additional regions.', author: 'Daniel Park', daysAgo: 47 },
    ],
  },
  {
    name: 'Berlin Bytes',
    tier: 'Pro',
    mrr: 3800,
    renewalDays: 150,
    csm: 'Lina Carlsson',
    nps: 70,
    usage: 75,
    open_tickets: 2,
    createdDaysAgo: 310,
    contacts: [
      { name: 'Lukas Becker', role: 'CEO', email: 'lukas@berlinbytes.de' },
      { name: 'Hannah Vogel', role: 'Head of Product', email: 'hannah@berlinbytes.de' },
    ],
    activities: [
      { type: 'call', text: 'Lukas shared positive feedback on latest release.', author: 'Lina Carlsson', daysAgo: 7 },
      { type: 'email', text: 'Connected Hannah with our solution architect.', author: 'Lina Carlsson', daysAgo: 19 },
      { type: 'note', text: 'Strong champion presence; reference candidate.', author: 'Lina Carlsson', daysAgo: 44 },
      { type: 'meeting', text: 'Quarterly review — green across the board.', author: 'Lina Carlsson', daysAgo: 62 },
    ],
  },
  {
    name: 'Solstice Studios',
    tier: 'Starter',
    mrr: 720,
    renewalDays: 95,
    csm: 'Maya Lopez',
    nps: 45,
    usage: 90,
    open_tickets: 1,
    createdDaysAgo: 200,
    contacts: [
      { name: 'Jules Moreau', role: 'Founder', email: 'jules@solsticestudios.io' },
      { name: 'Clara Dubois', role: 'Studio Lead', email: 'clara@solsticestudios.io' },
    ],
    activities: [
      { type: 'email', text: 'Onboarding wrap-up — Jules is power user.', author: 'Maya Lopez', daysAgo: 11 },
      { type: 'note', text: 'Tracking towards upgrade to Pro tier next quarter.', author: 'Maya Lopez', daysAgo: 25 },
      { type: 'call', text: 'Clara wants templates for client deliverables.', author: 'Maya Lopez', daysAgo: 50 },
      { type: 'system', text: 'Daily active usage above plan median.', author: 'system', daysAgo: 1 },
    ],
  },
  {
    name: 'CloudCanvas Inc',
    tier: 'Pro',
    mrr: 6400,
    renewalDays: 240,
    csm: 'Daniel Park',
    nps: 40,
    usage: 78,
    open_tickets: 2,
    createdDaysAgo: 480,
    contacts: [
      { name: 'Avery Quinn', role: 'VP Engineering', email: 'avery@cloudcanvas.com' },
      { name: 'Jamal Wright', role: 'Platform Engineer', email: 'jamal@cloudcanvas.com' },
      { name: 'Noor Hassan', role: 'Product Manager', email: 'noor@cloudcanvas.com' },
    ],
    activities: [
      { type: 'meeting', text: 'Roadmap sync — alignment on API improvements.', author: 'Daniel Park', daysAgo: 13 },
      { type: 'email', text: 'Jamal sent integration spec for review.', author: 'Jamal Wright', daysAgo: 22 },
      { type: 'note', text: 'Noor flagged minor UX concerns; logged in feedback.', author: 'Daniel Park', daysAgo: 38 },
      { type: 'call', text: 'Avery confirmed plans for additional workspace.', author: 'Daniel Park', daysAgo: 65 },
    ],
  },
  {
    name: 'Northwind Trading',
    tier: 'Enterprise',
    mrr: 14200,
    renewalDays: 420,
    csm: 'Sam Dijkstra',
    nps: 50,
    usage: 82,
    open_tickets: 4,
    createdDaysAgo: 1100,
    contacts: [
      { name: 'Iris Hartley', role: 'COO', email: 'iris@northwind.co.uk' },
      { name: 'Owen Blackwood', role: 'Head of IT', email: 'owen@northwind.co.uk' },
    ],
    activities: [
      { type: 'meeting', text: 'EBR — Iris highlighted platform as strategic.', author: 'Sam Dijkstra', daysAgo: 18 },
      { type: 'note', text: 'Owen pushing for SSO consolidation; in flight.', author: 'Sam Dijkstra', daysAgo: 30 },
      { type: 'email', text: 'Sent over Q2 enterprise feature preview.', author: 'Sam Dijkstra', daysAgo: 52 },
      { type: 'call', text: 'Ticket triage call — minor reporting issues.', author: 'Sam Dijkstra', daysAgo: 71 },
    ],
  },

  // ===== AMBER (6) =====
  // Three of these are churn-risk via "renewal <= 60 + health < 60".
  {
    name: 'Mediterraneo SaaS',
    tier: 'Pro',
    mrr: 5100,
    renewalDays: 30, // churn-risk path
    csm: 'Lina Carlsson',
    nps: 10,
    usage: 60,
    open_tickets: 4,
    createdDaysAgo: 410,
    contacts: [
      { name: 'Lorenzo Conti', role: 'Operations Director', email: 'lorenzo@mediterraneo.it' },
      { name: 'Giulia Romano', role: 'Account Owner', email: 'giulia@mediterraneo.it' },
    ],
    activities: [
      { type: 'call', text: 'Lorenzo raised concerns about reporting flexibility.', author: 'Lina Carlsson', daysAgo: 4 },
      { type: 'email', text: 'Sent comparison vs incumbent reporting tool.', author: 'Lina Carlsson', daysAgo: 9 },
      { type: 'meeting', text: 'Renewal discussion — pushed for early dialogue.', author: 'Lina Carlsson', daysAgo: 16 },
      { type: 'note', text: 'Champion turnover risk — Giulia may move teams.', author: 'Lina Carlsson', daysAgo: 28 },
      { type: 'system', text: 'Usage dipped 12% MoM.', author: 'system', daysAgo: 6 },
    ],
  },
  {
    name: 'Hanseatic Bank',
    tier: 'Enterprise',
    mrr: 19800,
    renewalDays: 45, // churn-risk path
    csm: 'Sam Dijkstra',
    nps: 0,
    usage: 55,
    open_tickets: 5,
    createdDaysAgo: 820,
    contacts: [
      { name: 'Klaus Hoffmann', role: 'Head of Operations', email: 'klaus@hanseatic.de' },
      { name: 'Annika Schulz', role: 'Compliance Lead', email: 'annika@hanseatic.de' },
      { name: 'Erik Brandt', role: 'IT Director', email: 'erik@hanseatic.de' },
    ],
    activities: [
      { type: 'meeting', text: 'Mitigation review — committed to fix top 3 issues.', author: 'Sam Dijkstra', daysAgo: 3 },
      { type: 'email', text: 'Annika requesting SOC2 update for renewal package.', author: 'Annika Schulz', daysAgo: 11 },
      { type: 'call', text: 'Erik flagged latency issues during peak.', author: 'Sam Dijkstra', daysAgo: 19 },
      { type: 'note', text: 'Procurement starting RFP review — neutral so far.', author: 'Sam Dijkstra', daysAgo: 34 },
      { type: 'system', text: 'Ticket SLA breached on case #2741.', author: 'system', daysAgo: 8 },
      { type: 'meeting', text: 'Exec touchpoint to confirm investment plans.', author: 'Sam Dijkstra', daysAgo: 58 },
    ],
  },
  {
    name: 'Vesper & Co',
    tier: 'Starter',
    mrr: 480,
    renewalDays: 130,
    csm: 'Maya Lopez',
    nps: -10,
    usage: 65,
    open_tickets: 3,
    createdDaysAgo: 260,
    contacts: [
      { name: 'Camille Laurent', role: 'Owner', email: 'camille@vesper.co' },
      { name: 'Théo Girard', role: 'Operations', email: 'theo@vesper.co' },
    ],
    activities: [
      { type: 'email', text: 'Camille asked about exporting historical data.', author: 'Camille Laurent', daysAgo: 5 },
      { type: 'call', text: 'Walked through reporting workaround.', author: 'Maya Lopez', daysAgo: 14 },
      { type: 'note', text: 'Smaller team — limited bandwidth for adoption.', author: 'Maya Lopez', daysAgo: 39 },
      { type: 'meeting', text: 'Check-in — moderate engagement, room to grow.', author: 'Maya Lopez', daysAgo: 67 },
    ],
  },
  {
    name: 'Albatross Media',
    tier: 'Pro',
    mrr: 3300,
    renewalDays: 55, // churn-risk path
    csm: 'Daniel Park',
    nps: 20,
    usage: 50,
    open_tickets: 5,
    createdDaysAgo: 380,
    contacts: [
      { name: 'Reese Hollister', role: 'Head of Production', email: 'reese@albatross.media' },
      { name: 'Sasha Vance', role: 'Editor', email: 'sasha@albatross.media' },
      { name: 'Quinn Patel', role: 'Studio Manager', email: 'quinn@albatross.media' },
    ],
    activities: [
      { type: 'meeting', text: 'Renewal review — Reese hesitant due to feature gaps.', author: 'Daniel Park', daysAgo: 6 },
      { type: 'note', text: 'Reviewing alternative vendor based on feature parity.', author: 'Daniel Park', daysAgo: 12 },
      { type: 'email', text: 'Shared feature commitment letter from product.', author: 'Daniel Park', daysAgo: 20 },
      { type: 'call', text: 'Sasha gave constructive feedback on UX flow.', author: 'Daniel Park', daysAgo: 33 },
      { type: 'system', text: 'Open ticket count above plan threshold.', author: 'system', daysAgo: 4 },
    ],
  },
  {
    name: 'Granite Peak Insurance',
    tier: 'Enterprise',
    mrr: 11500,
    renewalDays: 175,
    csm: 'Lina Carlsson',
    nps: 15,
    usage: 58,
    open_tickets: 6,
    createdDaysAgo: 640,
    contacts: [
      { name: 'Margot Whitman', role: 'Claims Director', email: 'margot@granitepeak.com' },
      { name: 'Joel Becker', role: 'Operations Lead', email: 'joel@granitepeak.com' },
    ],
    activities: [
      { type: 'meeting', text: 'Quarterly review — discussed claim workflow gaps.', author: 'Lina Carlsson', daysAgo: 15 },
      { type: 'email', text: 'Joel sent over ticket backlog for triage.', author: 'Joel Becker', daysAgo: 23 },
      { type: 'note', text: 'Adoption uneven across regional teams.', author: 'Lina Carlsson', daysAgo: 41 },
      { type: 'call', text: 'Margot asked for training for new hires.', author: 'Lina Carlsson', daysAgo: 60 },
    ],
  },
  {
    name: 'Sunset Apparel',
    tier: 'Starter',
    mrr: 380,
    renewalDays: 110,
    csm: 'Maya Lopez',
    nps: -20,
    usage: 68,
    open_tickets: 2,
    createdDaysAgo: 220,
    contacts: [
      { name: 'Brielle Carter', role: 'Founder', email: 'brielle@sunsetapparel.us' },
      { name: 'Andre Brooks', role: 'Inventory Lead', email: 'andre@sunsetapparel.us' },
    ],
    activities: [
      { type: 'email', text: 'Brielle following up on pricing question.', author: 'Brielle Carter', daysAgo: 8 },
      { type: 'call', text: 'Talked through inventory sync issues.', author: 'Maya Lopez', daysAgo: 19 },
      { type: 'note', text: 'Smaller account, lower priority but watchful.', author: 'Maya Lopez', daysAgo: 47 },
      { type: 'meeting', text: 'Brief sync — generally engaged.', author: 'Maya Lopez', daysAgo: 78 },
    ],
  },

  // ===== RED (4) =====
  {
    name: 'Riverbend Logistics',
    tier: 'Pro',
    mrr: 4600,
    renewalDays: 80,
    csm: 'Daniel Park',
    nps: -50,
    usage: 30,
    open_tickets: 9,
    createdDaysAgo: 500,
    contacts: [
      { name: 'Hugo Almeida', role: 'Operations Director', email: 'hugo@riverbend.pt' },
      { name: 'Inês Pereira', role: 'Account Owner', email: 'ines@riverbend.pt' },
      { name: 'Diego Cabrera', role: 'Warehouse Manager', email: 'diego@riverbend.pt' },
    ],
    activities: [
      { type: 'meeting', text: 'Save play kicked off — escalated to leadership.', author: 'Daniel Park', daysAgo: 2 },
      { type: 'email', text: 'Sent recovery plan with weekly check-in cadence.', author: 'Daniel Park', daysAgo: 5 },
      { type: 'call', text: 'Hugo cited reliability issues as primary blocker.', author: 'Daniel Park', daysAgo: 10 },
      { type: 'note', text: 'Champion lost (Inês moving roles next month).', author: 'Daniel Park', daysAgo: 18 },
      { type: 'system', text: 'Health score dropped below 40.', author: 'system', daysAgo: 11 },
      { type: 'meeting', text: 'Triage with product team for hotfix priorities.', author: 'Daniel Park', daysAgo: 26 },
    ],
  },
  {
    name: 'Atlas Telecom',
    tier: 'Enterprise',
    mrr: 24800,
    renewalDays: 140,
    csm: 'Sam Dijkstra',
    nps: -60,
    usage: 25,
    open_tickets: 8,
    createdDaysAgo: 1300,
    contacts: [
      { name: 'Beatrix Carlson', role: 'VP Customer Ops', email: 'beatrix@atlastelecom.com' },
      { name: 'Theo Nakamura', role: 'IT Lead', email: 'theo@atlastelecom.com' },
      { name: 'Rina Petrova', role: 'Procurement', email: 'rina@atlastelecom.com' },
    ],
    activities: [
      { type: 'meeting', text: 'Executive escalation — high churn risk.', author: 'Sam Dijkstra', daysAgo: 1 },
      { type: 'email', text: 'Sent revised SLA proposal as part of save plan.', author: 'Sam Dijkstra', daysAgo: 4 },
      { type: 'note', text: 'Procurement evaluating competitor; need to move fast.', author: 'Sam Dijkstra', daysAgo: 9 },
      { type: 'call', text: 'Theo confirmed three open infra issues blocking adoption.', author: 'Sam Dijkstra', daysAgo: 14 },
      { type: 'system', text: 'NPS survey returned -60 (detractor).', author: 'system', daysAgo: 21 },
      { type: 'meeting', text: 'Internal war-room set up — daily standups.', author: 'Sam Dijkstra', daysAgo: 30 },
    ],
  },
  {
    name: 'Petalbox',
    tier: 'Starter',
    mrr: 320,
    renewalDays: 22,
    csm: 'Maya Lopez',
    nps: -70,
    usage: 20,
    open_tickets: 7,
    createdDaysAgo: 180,
    contacts: [
      { name: 'Mira Holland', role: 'Founder', email: 'mira@petalbox.co' },
      { name: 'Devon Pierce', role: 'Operations', email: 'devon@petalbox.co' },
    ],
    activities: [
      { type: 'email', text: 'Mira asked about cancellation policy.', author: 'Mira Holland', daysAgo: 2 },
      { type: 'call', text: 'Save attempt — primary issue is fit, not product.', author: 'Maya Lopez', daysAgo: 6 },
      { type: 'note', text: 'Likely churn — pivoting to retention case study request.', author: 'Maya Lopez', daysAgo: 12 },
      { type: 'system', text: 'Daily usage near zero for 7 days.', author: 'system', daysAgo: 8 },
      { type: 'meeting', text: 'Final review with internal team on options.', author: 'Maya Lopez', daysAgo: 20 },
    ],
  },
  {
    name: 'Whitecliff Energy',
    tier: 'Pro',
    mrr: 7200,
    renewalDays: 250,
    csm: 'Lina Carlsson',
    nps: -40,
    usage: 35,
    open_tickets: 9,
    createdDaysAgo: 610,
    contacts: [
      { name: 'Calum MacAllister', role: 'Plant Manager', email: 'calum@whitecliff.energy' },
      { name: 'Freya Sinclair', role: 'Field Operations', email: 'freya@whitecliff.energy' },
      { name: 'Ravi Subramanian', role: 'Reliability Engineer', email: 'ravi@whitecliff.energy' },
    ],
    activities: [
      { type: 'meeting', text: 'Recovery kickoff — agreed on 60-day fix plan.', author: 'Lina Carlsson', daysAgo: 3 },
      { type: 'email', text: 'Shared engineering action plan with Calum.', author: 'Lina Carlsson', daysAgo: 7 },
      { type: 'call', text: 'Freya raised concerns about reporting accuracy.', author: 'Lina Carlsson', daysAgo: 15 },
      { type: 'note', text: 'Recurring tickets concentrated on integration X.', author: 'Lina Carlsson', daysAgo: 27 },
      { type: 'system', text: 'Open ticket count crossed plan threshold.', author: 'system', daysAgo: 13 },
    ],
  },
];

export async function seedIfEmpty(db: Client) {
  // Seed admin user
  const existingUsers = await db.execute('SELECT COUNT(*) AS n FROM users');
  if (Number(existingUsers.rows[0]?.n ?? 0) === 0) {
    await db.execute({
      sql: `INSERT INTO users (id, google_sub, email, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['usr_001', null, 'sam@dijkstradigital.com', 'Sam Dijkstra', 'admin', new Date().toISOString()],
    });
  }

  const existing = await db.execute('SELECT COUNT(*) AS n FROM customers');
  const n = Number(existing.rows[0]?.n ?? 0);
  if (n > 0) return;

  const stmts: { sql: string; args: any[] }[] = [];

  SEED.forEach((c, i) => {
    const cid = id('cus', i + 1);
    stmts.push({
      sql: `INSERT INTO customers (id, name, tier, mrr, renewal_date, csm, nps, usage, open_tickets, created_at, alerted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      args: [
        cid,
        c.name,
        c.tier,
        c.mrr,
        daysFromNow(c.renewalDays),
        c.csm,
        c.nps,
        c.usage,
        c.open_tickets,
        daysFromNow(-c.createdDaysAgo),
      ],
    });
    c.contacts.forEach((co, j) =>
      stmts.push({
        sql: 'INSERT INTO contacts (id, customer_id, name, role, email) VALUES (?, ?, ?, ?, ?)',
        args: [`${cid}_co_${String(j + 1).padStart(2, '0')}`, cid, co.name, co.role, co.email],
      })
    );
    c.activities.forEach((a, j) =>
      stmts.push({
        sql: 'INSERT INTO activities (id, customer_id, type, text, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          `${cid}_ac_${String(j + 1).padStart(2, '0')}`,
          cid,
          a.type,
          a.text,
          a.author,
          daysFromNow(-a.daysAgo),
        ],
      })
    );
  });

  await db.batch(stmts, 'write');
}
