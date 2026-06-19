import type { Row } from '@libsql/client';
import { getDb } from './db';
import { computeHealth, daysBetween, isChurnRisk } from './health';
import { buildAlertMessage, sendSlackAlert } from './slack';
import type {
  Activity,
  Comment,
  Contact,
  Customer,
  CustomerWithHealth,
  MetricSnapshot,
  StakeholderInfluence,
  StakeholderSentiment,
} from './types';

const ALERT_COOLDOWN_HOURS = 24;

function rowToCustomer(r: Row): Customer {
  return {
    id: String(r.id),
    name: String(r.name),
    tier: String(r.tier) as Customer['tier'],
    mrr: Number(r.mrr),
    renewal_date: String(r.renewal_date),
    csm: String(r.csm),
    nps: Number(r.nps),
    usage: Number(r.usage),
    open_tickets: Number(r.open_tickets),
    created_at: String(r.created_at),
    alerted_at: r.alerted_at == null ? null : String(r.alerted_at),
    parent_id: r.parent_id == null ? null : String(r.parent_id),
  };
}

function rowToContact(r: Row): Contact {
  return {
    id: String(r.id),
    customer_id: String(r.customer_id),
    name: String(r.name),
    role: String(r.role),
    email: String(r.email),
    influence: (String(r.influence ?? 'medium') as StakeholderInfluence),
    sentiment: (String(r.sentiment ?? 'neutral') as StakeholderSentiment),
    notes: String(r.notes ?? ''),
  };
}

function rowToActivity(r: Row): Activity {
  return {
    id: String(r.id),
    customer_id: String(r.customer_id),
    type: String(r.type) as Activity['type'],
    text: String(r.text),
    author: String(r.author),
    timestamp: String(r.timestamp),
  };
}

export async function listCustomers(): Promise<CustomerWithHealth[]> {
  const db = await getDb();
  const res = await db.execute('SELECT * FROM customers');
  const now = new Date().toISOString();
  return res.rows.map((r) => decorate(rowToCustomer(r), now));
}

export async function getCustomer(id: string): Promise<CustomerWithHealth | null> {
  const db = await getDb();
  const res = await db.execute({ sql: 'SELECT * FROM customers WHERE id = ?', args: [id] });
  if (res.rows.length === 0) return null;
  return decorate(rowToCustomer(res.rows[0]), new Date().toISOString());
}

export async function getContacts(customerId: string): Promise<Contact[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM contacts WHERE customer_id = ? ORDER BY name ASC',
    args: [customerId],
  });
  return res.rows.map(rowToContact);
}

export async function getActivities(customerId: string): Promise<Activity[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM activities WHERE customer_id = ? ORDER BY timestamp DESC',
    args: [customerId],
  });
  return res.rows.map(rowToActivity);
}

export interface ActivityWithCustomer extends Activity {
  customer_name: string;
}

export async function getActivitiesByAuthor(
  author: string,
  limit = 12
): Promise<ActivityWithCustomer[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT a.*, c.name AS customer_name
          FROM activities a
          JOIN customers c ON c.id = a.customer_id
          WHERE a.author = ?
          ORDER BY a.timestamp DESC
          LIMIT ?`,
    args: [author, limit],
  });
  return res.rows.map((r) => ({
    ...rowToActivity(r),
    customer_name: String(r.customer_name),
  }));
}

export async function logActivity(input: {
  customer_id: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  text: string;
  author: string;
}): Promise<Activity> {
  const db = await getDb();
  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO activities (id, customer_id, type, text, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, input.customer_id, input.type, input.text, input.author, timestamp],
  });
  return {
    id,
    customer_id: input.customer_id,
    type: input.type,
    text: input.text,
    author: input.author,
    timestamp,
  };
}

function decorate(c: Customer, nowISO: string): CustomerWithHealth {
  const health = computeHealth(c);
  const daysToRenewal = daysBetween(nowISO, c.renewal_date);
  const churnRisk = isChurnRisk(health.score, daysToRenewal);
  return { ...c, health, daysToRenewal, churnRisk };
}

// ── Time-series ─────────────────────────────────────────────────────────────

export async function getMetricHistory(customerId: string): Promise<MetricSnapshot[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM metric_snapshots WHERE customer_id = ? ORDER BY week ASC',
    args: [customerId],
  });
  return res.rows.map((r) => ({
    customer_id: String(r.customer_id),
    week: String(r.week),
    health: Number(r.health),
    usage: Number(r.usage),
    nps: Number(r.nps),
    mrr: Number(r.mrr),
    open_tickets: Number(r.open_tickets),
  }));
}

// Portfolio-wide weekly averages for the analytics trend chart.
export async function getPortfolioHistory(): Promise<
  Array<{ week: string; avgHealth: number; avgUsage: number; totalMrr: number }>
> {
  const db = await getDb();
  const res = await db.execute(
    `SELECT week,
            ROUND(AVG(health)) AS avgHealth,
            ROUND(AVG(usage)) AS avgUsage,
            SUM(mrr) AS totalMrr
     FROM metric_snapshots
     GROUP BY week
     ORDER BY week ASC`
  );
  return res.rows.map((r) => ({
    week: String(r.week),
    avgHealth: Number(r.avgHealth),
    avgUsage: Number(r.avgUsage),
    totalMrr: Number(r.totalMrr),
  }));
}

// ── Account hierarchy ───────────────────────────────────────────────────────

export async function getChildren(parentId: string): Promise<CustomerWithHealth[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM customers WHERE parent_id = ?',
    args: [parentId],
  });
  const now = new Date().toISOString();
  return res.rows.map((r) => decorate(rowToCustomer(r), now));
}

// ── Comments + mentions ─────────────────────────────────────────────────────

function rowToComment(r: Row): Comment {
  let mentions: string[] = [];
  try {
    mentions = JSON.parse(String(r.mentions ?? '[]'));
  } catch {
    mentions = [];
  }
  return {
    id: String(r.id),
    customer_id: String(r.customer_id),
    author: String(r.author),
    body: String(r.body),
    mentions,
    created_at: String(r.created_at),
  };
}

export async function getComments(customerId: string): Promise<Comment[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT * FROM comments WHERE customer_id = ? ORDER BY created_at ASC',
    args: [customerId],
  });
  return res.rows.map(rowToComment);
}

export async function addComment(input: {
  customer_id: string;
  author: string;
  body: string;
  mentions: string[];
}): Promise<Comment> {
  const db = await getDb();
  const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const created_at = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO comments (id, customer_id, author, body, mentions, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, input.customer_id, input.author, input.body, JSON.stringify(input.mentions), created_at],
  });
  return { id, ...input, created_at };
}

export interface CommentWithCustomer extends Comment {
  customer_name: string;
}

// Comments that mention a given name — for the "mentions of me" cockpit panel.
export async function getMentionsOf(name: string, limit = 6): Promise<CommentWithCustomer[]> {
  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT cm.*, c.name AS customer_name
          FROM comments cm
          JOIN customers c ON c.id = cm.customer_id
          WHERE cm.mentions LIKE ?
          ORDER BY cm.created_at DESC
          LIMIT ?`,
    args: [`%${name}%`, limit],
  });
  return res.rows
    .map((r) => ({ ...rowToComment(r), customer_name: String(r.customer_name) }))
    .filter((c) => c.mentions.includes(name));
}

export async function maybeAutoAlert(customerId: string): Promise<{ fired: boolean; reason?: string }> {
  const c = await getCustomer(customerId);
  if (!c) return { fired: false, reason: 'customer not found' };

  const flagged = c.health.band === 'red' || c.churnRisk;
  if (!flagged) return { fired: false, reason: 'not in alert state' };

  const lastAlert = c.alerted_at ? new Date(c.alerted_at).getTime() : 0;
  const cooldownMs = ALERT_COOLDOWN_HOURS * 60 * 60 * 1000;
  if (Date.now() - lastAlert < cooldownMs) {
    return { fired: false, reason: 'within cooldown' };
  }

  const text = buildAlertMessage(c);
  await sendSlackAlert(text);
  const db = await getDb();
  await db.execute({
    sql: 'UPDATE customers SET alerted_at = ? WHERE id = ?',
    args: [new Date().toISOString(), customerId],
  });
  return { fired: true };
}

export async function manualAlert(customerId: string): Promise<{
  ok: boolean;
  sent: boolean;
  reason?: string;
  message?: string;
}> {
  const c = await getCustomer(customerId);
  if (!c) return { ok: false, sent: false, reason: 'customer not found' };
  const text = buildAlertMessage(c);
  const result = await sendSlackAlert(text);
  const db = await getDb();
  await db.execute({
    sql: 'UPDATE customers SET alerted_at = ? WHERE id = ?',
    args: [new Date().toISOString(), customerId],
  });
  return { ok: true, sent: result.sent, reason: result.reason, message: text };
}
