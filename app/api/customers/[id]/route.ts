import { NextResponse } from 'next/server';
import { getCustomer } from '@/lib/customers';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = await getCustomer(params.id);
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ customer: c });
}
