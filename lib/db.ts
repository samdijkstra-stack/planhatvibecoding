import { createClient, type Client } from '@libsql/client';
import { seedIfEmpty } from './seed';

let _client: Client | null = null;
let _initPromise: Promise<Client> | null = null;

async function init(): Promise<Client> {
  // In-memory libSQL — pure WASM, works on serverless (Vercel/Netlify) and locally.
  // DB is process-local: lives as long as the warm instance, fresh seed on cold start.
  // For a workshop demo this is ideal — each session starts clean.
  const client = createClient({ url: ':memory:' });

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS customers (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         tier TEXT NOT NULL,
         mrr REAL NOT NULL,
         renewal_date TEXT NOT NULL,
         csm TEXT NOT NULL,
         nps INTEGER NOT NULL,
         usage REAL NOT NULL,
         open_tickets INTEGER NOT NULL,
         created_at TEXT NOT NULL,
         alerted_at TEXT
       )`,
      `CREATE TABLE IF NOT EXISTS contacts (
         id TEXT PRIMARY KEY,
         customer_id TEXT NOT NULL,
         name TEXT NOT NULL,
         role TEXT NOT NULL,
         email TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS activities (
         id TEXT PRIMARY KEY,
         customer_id TEXT NOT NULL,
         type TEXT NOT NULL,
         text TEXT NOT NULL,
         author TEXT NOT NULL,
         timestamp TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS integration_secrets (
         provider TEXT PRIMARY KEY,
         ciphertext TEXT NOT NULL,
         iv TEXT NOT NULL,
         auth_tag TEXT NOT NULL,
         meta TEXT NOT NULL DEFAULT '{}',
         updated_at TEXT NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS users (
         id TEXT PRIMARY KEY,
         google_sub TEXT UNIQUE,
         email TEXT UNIQUE NOT NULL,
         name TEXT NOT NULL,
         role TEXT NOT NULL DEFAULT 'csm',
         created_at TEXT NOT NULL,
         last_login TEXT
       )`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_customer ON activities(customer_id)`,
    ],
    'write'
  );

  await seedIfEmpty(client);
  return client;
}

export async function getDb(): Promise<Client> {
  if (_client) return _client;
  if (!_initPromise) {
    _initPromise = init().then((c) => {
      _client = c;
      return c;
    });
  }
  return _initPromise;
}
