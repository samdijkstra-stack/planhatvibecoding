import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addComment, getComments } from '@/lib/customers';
import { verifySessionToken } from '@/lib/auth';
import { extractMentions } from '@/lib/team';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = await getComments(params.id);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = cookies().get('ph_session')?.value;
  const user = token ? verifySessionToken(token) : null;
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { body } = await req.json();
  if (typeof body !== 'string' || !body.trim()) {
    return NextResponse.json({ error: 'body required' }, { status: 400 });
  }

  const mentions = extractMentions(body);
  const comment = await addComment({
    customer_id: params.id,
    author: user.name,
    body: body.trim(),
    mentions,
  });

  return NextResponse.json({ comment });
}
