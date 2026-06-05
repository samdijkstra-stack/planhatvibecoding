import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seedIfEmpty } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'csp.db');

let _db: Database.Database | null = null;

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
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
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      author TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id);
    CREATE INDEX IF NOT EXISTS idx_activities_customer ON activities(customer_id);
  `);
}

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  ensureSchema(db);
  seedIfEmpty(db);

  _db = db;
  return db;
}
