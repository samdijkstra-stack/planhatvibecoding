import { NextResponse } from 'next/server';
import { manualAlert } from '@/lib/customers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const customerId = typeof body?.customerId === 'string' ? body.customerId : '';
  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }
  const result = await manualAlert(customerId);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? 'Failed' }, { status: 404 });
  }
  return NextResponse.json(result);
}
