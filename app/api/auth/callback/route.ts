import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createSessionToken, type SessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=denied', req.url));
  }

  const savedState = req.cookies.get('oauth_auth_state')?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/login?error=state', req.url));
  }

  const redirectUri =
    process.env.GOOGLE_AUTH_REDIRECT_URI ?? `${req.nextUrl.origin}/api/auth/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/login?error=exchange', req.url));
  }

  const { access_token } = await tokenRes.json();

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL('/login?error=userinfo', req.url));
  }

  const { sub, email, name } = await userInfoRes.json();
  if (!email) {
    return NextResponse.redirect(new URL('/login?error=noemail', req.url));
  }

  const db = await getDb();
  const now = new Date().toISOString();

  // Find by google_sub first, fall back to email match
  let row: Record<string, unknown> | null = null;
  const bySub = await db.execute({
    sql: 'SELECT * FROM users WHERE google_sub = ?',
    args: [sub],
  });

  if (bySub.rows.length > 0) {
    row = bySub.rows[0] as Record<string, unknown>;
    await db.execute({
      sql: 'UPDATE users SET last_login = ? WHERE id = ?',
      args: [now, String(row.id)],
    });
  } else {
    const byEmail = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });
    if (byEmail.rows.length > 0) {
      row = byEmail.rows[0] as Record<string, unknown>;
      await db.execute({
        sql: 'UPDATE users SET google_sub = ?, name = ?, last_login = ? WHERE id = ?',
        args: [sub, String(name ?? row.name), now, String(row.id)],
      });
    } else {
      // Unknown email — create with csm role
      const id = `usr_${Date.now()}`;
      await db.execute({
        sql: 'INSERT INTO users (id, google_sub, email, name, role, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, sub, email, name ?? email, 'csm', now, now],
      });
      const fresh = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [id],
      });
      row = fresh.rows[0] as Record<string, unknown>;
    }
  }

  const sessionUser: SessionUser = {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: (row.role as 'admin' | 'csm') ?? 'csm',
  };

  const token = createSessionToken(sessionUser);
  const response = NextResponse.redirect(new URL('/', req.url));
  response.cookies.set('ph_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  });
  response.cookies.delete('oauth_auth_state');
  return response;
}
