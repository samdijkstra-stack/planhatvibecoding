import { getDb } from './db';
import { encrypt, decrypt } from './crypto';

export type Provider = 'slack' | 'attio' | 'gmail';

export interface IntegrationStatus {
  connected: boolean;
  maskedHint?: string;
  email?: string;
  lastTestedAt?: string | null;
  lastTestOk?: boolean | null;
}

export interface TestResult {
  ok: boolean;
  detail?: string;
  error?: string;
}

export function maskHint(s: string): string {
  if (s.length <= 8) return `${s.slice(0, 4)}…`;
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}

// ── Store operations ──────────────────────────────────────────────────────────

export async function saveSecret(
  provider: Provider,
  secret: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const { ciphertext, iv, authTag } = encrypt(secret);
  const db = await getDb();
  await db.execute({
    sql: `INSERT OR REPLACE INTO integration_secrets
            (provider, ciphertext, iv, auth_tag, meta, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [provider, ciphertext, iv, authTag, JSON.stringify(meta), new Date().toISOString()],
  });
}

export async function getRawSecret(provider: Provider): Promise<string | null> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT ciphertext, iv, auth_tag FROM integration_secrets WHERE provider = ?',
    args: [provider],
  });
  if (res.rows.length === 0) return null;
  const { ciphertext, iv, auth_tag } = res.rows[0];
  try {
    return decrypt(String(ciphertext), String(iv), String(auth_tag));
  } catch {
    return null;
  }
}

export async function getIntegrationStatus(provider: Provider): Promise<IntegrationStatus> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT meta FROM integration_secrets WHERE provider = ?',
    args: [provider],
  });
  if (res.rows.length === 0) return { connected: false };
  try {
    const meta = JSON.parse(String(res.rows[0].meta ?? '{}'));
    return { connected: true, ...meta };
  } catch {
    return { connected: true };
  }
}

export async function updateTestMeta(provider: Provider, ok: boolean): Promise<void> {
  const db = await getDb();
  const res = await db.execute({
    sql: 'SELECT meta FROM integration_secrets WHERE provider = ?',
    args: [provider],
  });
  if (res.rows.length === 0) return;
  const meta = JSON.parse(String(res.rows[0].meta ?? '{}'));
  meta.lastTestedAt = new Date().toISOString();
  meta.lastTestOk = ok;
  await db.execute({
    sql: 'UPDATE integration_secrets SET meta = ? WHERE provider = ?',
    args: [JSON.stringify(meta), provider],
  });
}

export async function deleteIntegration(provider: Provider): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: 'DELETE FROM integration_secrets WHERE provider = ?',
    args: [provider],
  });
}

// ── Provider test runners ─────────────────────────────────────────────────────

export async function testProvider(provider: Provider): Promise<TestResult> {
  const secret = await getRawSecret(provider);
  if (!secret) return { ok: false, error: 'Not connected' };
  switch (provider) {
    case 'slack': return testSlack(secret);
    case 'attio': return testAttio(secret);
    case 'gmail': return testGmail(secret);
  }
}

async function testSlack(token: string): Promise<TestResult> {
  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) return { ok: true, detail: `Workspace: ${data.team}` };
    return { ok: false, error: data.error };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function testAttio(apiKey: string): Promise<TestResult> {
  try {
    const res = await fetch('https://api.attio.com/v2/self', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, detail: `Workspace: ${data.data?.slug ?? 'Attio'}` };
    }
    if (res.status === 401) return { ok: false, error: 'Invalid API key' };
    return { ok: false, error: `Attio API responded ${res.status}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function testGmail(secretJson: string): Promise<TestResult> {
  try {
    const { refreshToken } = JSON.parse(secretJson) as { refreshToken: string };
    const accessToken = await refreshGmailToken(refreshToken);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, detail: `Connected as: ${data.emailAddress}` };
    }
    return { ok: false, error: `Gmail API responded ${res.status}` };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── Gmail OAuth helpers ───────────────────────────────────────────────────────

export function buildGmailAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGmailCode(
  code: string
): Promise<{ refreshToken: string; accessToken: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const data = await res.json();
  if (!data.access_token || !data.refresh_token) {
    throw new Error(
      `Token exchange failed: ${data.error_description ?? data.error ?? 'unknown'}`
    );
  }
  return { refreshToken: data.refresh_token, accessToken: data.access_token };
}

export async function getGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string }> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail profile fetch failed: ${res.status}`);
  return res.json();
}

async function refreshGmailToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(
      `Token refresh failed: ${data.error_description ?? data.error ?? 'unknown'}`
    );
  }
  return data.access_token;
}
