import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { buildGmailAuthUrl } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 });
  }
  if (!process.env.APP_ENCRYPTION_KEY) {
    return NextResponse.json(
      { error: 'APP_ENCRYPTION_KEY not configured on the server' },
      { status: 503 }
    );
  }

  const state = randomBytes(16).toString('hex');
  const authUrl = buildGmailAuthUrl(state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  });
  return res;
}
