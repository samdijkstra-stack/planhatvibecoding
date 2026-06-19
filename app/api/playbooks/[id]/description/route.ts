import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getPlaybook } from '@/lib/playbooks';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playbook = getPlaybook(params.id);
  if (!playbook) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { description } = await req.json();
  if (typeof description !== 'string') {
    return NextResponse.json({ error: 'description must be a string' }, { status: 400 });
  }

  const db = await getDb();
  await db.execute({
    sql: `INSERT OR REPLACE INTO playbook_overrides (playbook_id, description, updated_at)
          VALUES (?, ?, ?)`,
    args: [params.id, description, new Date().toISOString()],
  });

  return NextResponse.json({ ok: true });
}
