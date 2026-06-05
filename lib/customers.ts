import { getDb } from './db';
import { computeHealth, daysBetween, isChurnRisk } from './health';
import { buildAlertMessage, sendSlackAlert } from './slack';
import type { Activity, Contact, Customer, CustomerWithHealth } from './types';

const ALERT_COOLDOWN_HOURS = 24;

export function listCustomers(): CustomerWithHealth[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM customers').all() as Customer[];
  const now = new Date().toISOString();
  return rows.map((c) => decorate(c, now));
}

export function getCustomer(id: string): CustomerWithHealth | null {
  const db = getDb();
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
  if (!c) return null;
  return decorate(c, new Date().toISOString());
}

export function getContacts(customerId: string): Contact[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM contacts WHERE customer_id = ? ORDER BY name ASC')
    .all(customerId) as Contact[];
}

export function getActivities(customerId: string): Activity[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM activities WHERE customer_id = ? ORDER BY timestamp DESC')
    .all(customerId) as Activity[];
}

export function logActivity(input: {
  customer_id: string;
  type: 'note' | 'call' | 'email' | 'meeting';
  text: string;
  author: string;
}): Activity {
  const db = getDb();
  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  db.prepare(
    'INSERT INTO activities (id, customer_id, type, text, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, input.customer_id, input.type, input.text, input.author, timestamp);
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

/**
 * Should be called after any server-side change to a customer that may affect health.
 * Fires a Slack alert if:
 *  - Customer is currently red or churn-risk
 *  - And no alert has been sent in the last 24h
 */
export async function maybeAutoAlert(customerId: string): Promise<{ fired: boolean; reason?: string }> {
  const c = getCustomer(customerId);
  if (!c) return { fired: false, reason: 'customer not found' };

  const flagged = c.health.band === 'red' || c.churnRisk;
  if (!flagged) return { fired: false, reason: 'not in alert state' };

  const db = getDb();
  const row = db.prepare('SELECT alerted_at FROM customers WHERE id = ?').get(customerId) as
    | { alerted_at: string | null }
    | undefined;
  const lastAlert = row?.alerted_at ? new Date(row.alerted_at).getTime() : 0;
  const cooldownMs = ALERT_COOLDOWN_HOURS * 60 * 60 * 1000;
  if (Date.now() - lastAlert < cooldownMs) {
    return { fired: false, reason: 'within cooldown' };
  }

  const text = buildAlertMessage(c);
  await sendSlackAlert(text);
  db.prepare('UPDATE customers SET alerted_at = ? WHERE id = ?').run(new Date().toISOString(), customerId);
  return { fired: true };
}

export async function manualAlert(customerId: string): Promise<{ ok: boolean; sent: boolean; reason?: string; message?: string }> {
  const c = getCustomer(customerId);
  if (!c) return { ok: false, sent: false, reason: 'customer not found' };
  const text = buildAlertMessage(c);
  const result = await sendSlackAlert(text);
  const db = getDb();
  db.prepare('UPDATE customers SET alerted_at = ? WHERE id = ?').run(new Date().toISOString(), customerId);
  return { ok: true, sent: result.sent, reason: result.reason, message: text };
}
