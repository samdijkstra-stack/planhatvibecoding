import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getPlaybook } from '@/lib/playbooks';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

interface EnrollContact {
  contactId: string;
  customerId: string;
  matchReason: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playbook = getPlaybook(params.id);
  if (!playbook) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = cookies().get('ph_session')?.value;
  const user = token ? verifySessionToken(token) : null;
  const enrolledBy = user?.name ?? 'unknown';

  const { contacts } = (await req.json()) as { contacts: EnrollContact[] };
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: 'contacts array required' }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date().toISOString();
  let enrolled = 0;

  for (const c of contacts) {
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO enrollments
                (id, playbook_id, contact_id, customer_id, enrolled_at, enrolled_by, match_reason)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `enr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          params.id,
          c.contactId,
          c.customerId,
          now,
          enrolledBy,
          c.matchReason,
        ],
      });
      enrolled++;
    } catch {
      // duplicate — already enrolled, skip
    }
  }

  return NextResponse.json({ ok: true, enrolled });
}
