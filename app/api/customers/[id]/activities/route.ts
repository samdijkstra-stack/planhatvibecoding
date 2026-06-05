import { NextResponse } from 'next/server';
import { getActivities, getCustomer, logActivity, maybeAutoAlert } from '@/lib/customers';

export const dynamic = 'force-dynamic';

type TouchpointType = 'note' | 'call' | 'email' | 'meeting';
const ALLOWED: TouchpointType[] = ['note', 'call', 'email', 'meeting'];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!getCustomer(params.id)) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  return NextResponse.json({ activities: getActivities(params.id) });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!getCustomer(params.id)) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body?.type as TouchpointType;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const author = typeof body?.author === 'string' && body.author.trim() ? body.author.trim() : 'Unknown';

  if (!ALLOWED.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${ALLOWED.join(', ')}` },
      { status: 400 }
    );
  }
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const activity = logActivity({ customer_id: params.id, type, text, author });
  const alert = await maybeAutoAlert(params.id);

  return NextResponse.json({ activity, alert });
}
