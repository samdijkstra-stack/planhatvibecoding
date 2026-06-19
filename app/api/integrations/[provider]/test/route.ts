import { NextResponse } from 'next/server';
import { testProvider, updateTestMeta } from '@/lib/integrations';
import type { Provider } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

const VALID: Provider[] = ['slack', 'attio', 'gmail'];

export async function POST(
  _req: Request,
  { params }: { params: { provider: string } }
) {
  const provider = params.provider as Provider;
  if (!VALID.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  const result = await testProvider(provider);
  await updateTestMeta(provider, result.ok);
  return NextResponse.json(result);
}
