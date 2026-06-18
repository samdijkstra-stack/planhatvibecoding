import type { Row } from '@libsql/client';
import { getDb } from './db';
import { computeHealth, daysBetween, isChurnRisk } from './health';
import { buildAlertMessage, sendSlackAlert } from './slack';
import type { Activity, Contact, Customer, CustomerWithHealth } from './types';

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
  };
}

function rowToContact(r: Row): Contact {
  return {
    id: String(r.id),
    customer_id: String(r.customer_id),
    name: String(r.name),
    role: String(r.role),
    email: String(r.email),
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
