import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPlaybook } from '@/lib/playbooks';
import { getDb } from '@/lib/db';
import { listCustomers } from '@/lib/customers';
import { getContacts } from '@/lib/customers';
import type { Contact } from '@/lib/types';
import { PlaybookDescription } from '@/components/PlaybookDescription';
import { EnrollmentPicker, type PickerContact } from '@/components/EnrollmentPicker';

export const dynamic = 'force-dynamic';

export default async function PlaybookDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const playbook = getPlaybook(params.id);
  if (!playbook) notFound();

  const [customers, db] = await Promise.all([listCustomers(), getDb()]);

  // Load all contacts for matching customers
  const matchCandidates = playbook.match(customers, []);
  const customerIds = [...new Set(matchCandidates.map((m) => m.customer.id))];
  const contactArrays = await Promise.all(customerIds.map((id) => getContacts(id)));
  const allContacts: Contact[] = contactArrays.flat();

  // Run full match with contacts
  const matches = playbook.match(customers, allContacts);

  // Load enrollments for this playbook
  const enrollmentRes = await db.execute({
    sql: 'SELECT contact_id, match_reason FROM enrollments WHERE playbook_id = ?',
    args: [params.id],
  });
  const enrolledIds = new Set(enrollmentRes.rows.map((r) => String(r.contact_id)));
  const enrolledReasons = new Map(
    enrollmentRes.rows.map((r) => [String(r.contact_id), String(r.match_reason)])
  );

  // Load description override
  const descRes = await db.execute({
    sql: 'SELECT description FROM playbook_overrides WHERE playbook_id = ?',
    args: [params.id],
  });
  const description =
    descRes.rows.length > 0 ? String(descRes.rows[0].description) : playbook.description;

  // Build picker data: suggestions + already enrolled
  const suggestions: PickerContact[] = matches.map((m) => ({
    contactId: m.contact.id,
    contactName: m.contact.name,
    contactRole: m.contact.role,
    contactEmail: m.contact.email,
    customerId: m.customer.id,
    customerName: m.customer.name,
    reason: m.reason,
    alreadyEnrolled: enrolledIds.has(m.contact.id),
  }));

  // Add enrolled contacts that are no longer matching (don't drop them from the list)
  const matchedContactIds = new Set(matches.map((m) => m.contact.id));
  for (const [contactId, reason] of enrolledReasons) {
    if (!matchedContactIds.has(contactId)) {
      const contact = allContacts.find((c) => c.id === contactId);
      const customer = customers.find((c) => c.id === contact?.customer_id);
      if (contact && customer) {
        suggestions.push({
          contactId: contact.id,
          contactName: contact.name,
          contactRole: contact.role,
          contactEmail: contact.email,
          customerId: customer.id,
          customerName: customer.name,
          reason,
          alreadyEnrolled: true,
        });
      }
    }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    'Save play': '#f06a2a',
    Adoption: '#3b82f6',
    Onboarding: '#2a9c5e',
    Expansion: '#7b5ee6',
    Risk: '#d97706',
  };
  const categoryColor = CATEGORY_COLORS[playbook.category] ?? '#595959';

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="border-b border-line px-8 pb-5 pt-[22px]">
        <Link
          href="/playbooks"
          className="mb-3 inline-flex items-center gap-1 text-[11.5px] text-ink-4 hover:text-ink-1"
        >
          ← Playbooks
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="eyebrow mb-2"
              style={{ color: categoryColor }}
            >
              {playbook.category}
            </div>
            <h1 className="display text-[24px] leading-[1.1] text-ink-1">{playbook.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-[5px] rounded-rect bg-good-soft px-[8px] py-[3px] text-[10px] font-medium uppercase tracking-[0.07em] text-good">
              <span className="h-[5px] w-[5px] rounded-full bg-[#2a9c5e]" />
              Active
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-ink-4">
          <span>
            <span className="mr-1 text-ink-5">Trigger</span>
            {playbook.trigger}
          </span>
          <span className="text-ink-5">·</span>
          <span>
            <span className="mr-1 text-ink-5">Steps</span>
            {playbook.steps.length}
          </span>
          <span className="text-ink-5">·</span>
          <span>
            <span className="mr-1 text-ink-5">Enrolled</span>
            {enrolledIds.size} contacts
          </span>
        </div>
      </div>

      {/* Description — editable */}
      <PlaybookDescription playbookId={params.id} initial={description} />

      {/* Impact */}
      <section className="border-b border-line px-8 py-6">
        <div className="mb-4 text-[12.5px] font-medium text-ink-1">Impact</div>
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {playbook.impact.metrics.map((m) => (
            <div key={m.label} className="rounded border border-line bg-paper p-4">
              <div className="eyebrow mb-2">{m.label}</div>
              <div className="display num text-[26px] font-semibold leading-none text-ink-1">
                {m.value}
              </div>
              {m.subLabel && (
                <div className="mt-1 text-[10.5px] text-ink-4">{m.subLabel}</div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 rounded border border-line bg-surface px-4 py-3">
          <span className="mt-[1px] shrink-0 text-[11px] text-ink-4">ℹ</span>
          <div>
            <div className="mb-[2px] text-[10.5px] font-medium uppercase tracking-eyebrow text-ink-4">
              How measured
            </div>
            <p className="text-[12px] leading-[1.6] text-ink-3">{playbook.impact.measured}</p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="border-b border-line px-8 py-6">
        <div className="mb-4 text-[12.5px] font-medium text-ink-1">
          Steps ({playbook.steps.length})
        </div>
        <ol className="flex flex-col gap-0">
          {playbook.steps.map((step, i) => (
            <li key={step.n} className="flex gap-4 border-t border-line py-4 first:border-t-0">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
                style={{
                  background: i === 0 ? categoryColor : '#f0f0f0',
                  color: i === 0 ? 'white' : '#595959',
                }}
              >
                {step.n}
              </div>
              <div className="min-w-0 flex-1 pt-[1px]">
                <div className="text-[13px] font-medium text-ink-1">{step.label}</div>
                <div className="mt-[3px] text-[12px] leading-[1.55] text-ink-4">{step.detail}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Enrollment picker */}
      <EnrollmentPicker playbookId={params.id} suggestions={suggestions} />

      <div className="h-16" />
    </div>
  );
}
