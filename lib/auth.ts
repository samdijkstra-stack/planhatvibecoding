import { createHmac } from 'crypto';

export type Role = 'admin' | 'csm';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function signingKey(): string {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error('APP_ENCRYPTION_KEY not set');
  return key;
}

export function createSessionToken(user: SessionUser): string {
  const exp = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
  const sig = createHmac('sha256', signingKey()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac('sha256', signingKey()).update(payload).digest('base64url');
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    const { id, email, name, role } = data;
    if (!id || !email || !name || !role) return null;
    return { id, email, name, role };
  } catch {
    return null;
  }
}
