import { NextResponse } from 'next/server';
import {
  getIntegrationStatus,
  saveSecret,
  deleteIntegration,
  maskHint,
} from '@/lib/integrations';
import type { Provider } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

const VALID: Provider[] = ['slack', 'attio', 'gmail'];

export async function GET(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as Provider;
  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  return NextResponse.json(await getIntegrationStatus(provider));
}

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as Provider;
  if (!['slack', 'attio'].includes(provider)) {
    return NextResponse.json(
      { error: 'Use the OAuth flow for this provider' },
      { status: 400 }
    );
  }
  if (!process.env.APP_ENCRYPTION_KEY) {
    return NextResponse.json(
      { error: 'APP_ENCRYPTION_KEY not configured on the server' },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const token =
    typeof (body as Record<string, unknown>)?.token === 'string'
      ? ((body as Record<string, unknown>).token as string).trim()
      : '';
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }
  await saveSecret(provider, token, { maskedHint: maskHint(token) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as Provider;
  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  await deleteIntegration(provider);
  return NextResponse.json({ ok: true });
}
