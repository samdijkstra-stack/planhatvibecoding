import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeGmailCode,
  getGmailProfile,
  saveSecret,
} from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const base = url.origin;

  const redirect = (param: string) =>
    NextResponse.redirect(`${base}/settings/integrations?${param}`);

  if (error || !code || !state) {
    return redirect('error=gmail_denied');
  }

  const cookieStore = cookies();
  const savedState = cookieStore.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return redirect('error=gmail_state_mismatch');
  }

  try {
    const { refreshToken, accessToken } = await exchangeGmailCode(code);
    const profile = await getGmailProfile(accessToken);

    await saveSecret('gmail', JSON.stringify({ refreshToken }), {
      maskedHint: profile.emailAddress,
      email: profile.emailAddress,
    });

    const res = redirect('success=gmail');
    res.cookies.delete('oauth_state');
    return res;
  } catch (err) {
    console.error('[gmail:callback]', err);
    return redirect('error=gmail_exchange_failed');
  }
}
