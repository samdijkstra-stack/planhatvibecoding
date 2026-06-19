'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PickerContact {
  contactId: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  customerId: string;
  customerName: string;
  reason: string;
  alreadyEnrolled: boolean;
}

interface Props {
  playbookId: string;
  suggestions: PickerContact[];
}

export function EnrollmentPicker({ playbookId, suggestions }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suggestions.filter((s) => !s.alreadyEnrolled).map((s) => s.contactId))
  );
  const [enrolling, setEnrolling] = useState(false);
  const [result, setResult] = useState<{ enrolled: number } | null>(null);

  const pending = suggestions.filter((s) => !s.alreadyEnrolled);
  const enrolled = suggestions.filter((s) => s.alreadyEnrolled);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEnroll() {
    const toEnroll = suggestions.filter((s) => selected.has(s.contactId) && !s.alreadyEnrolled);
    if (toEnroll.length === 0) return;
    setEnrolling(true);
    setResult(null);
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: toEnroll.map((s) => ({
            contactId: s.contactId,
            customerId: s.customerId,
            matchReason: s.reason,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ enrolled: data.enrolled });
        setSelected(new Set());
        router.refresh();
      }
    } finally {
      setEnrolling(false);
    }
  }

  if (suggestions.length === 0) {
    return (
      <section className="border-b border-line px-8 py-6">
        <div className="eyebrow-sm mb-3">Enrollment</div>
        <p className="text-[12.5px] text-ink-4">
          No contacts currently match this playbook&apos;s trigger condition.
        </p>
      </section>
    );
  }

  return (
    <section className="border-b border-line px-8 py-6">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="eyebrow-sm">Enrollment</div>
        <span className="text-[11.5px] text-ink-4">
          {enrolled.length} already enrolled · {pending.length} suggested
        </span>
      </div>
      <p className="mb-5 text-[12px] text-ink-4">
        Contacts matched by trigger condition. Select who to enroll — only enrolled contacts
        receive this playbook&apos;s outreach steps.
      </p>

      {result && (
        <div className="mb-4 rounded border border-good bg-good-soft px-4 py-3 text-[12.5px] text-good">
          ✓ {result.enrolled} contact{result.enrolled !== 1 ? 's' : ''} enrolled successfully.
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-eyebrow text-ink-4">
            Suggested — matching trigger
          </div>
          <ul className="flex flex-col divide-y divide-line rounded border border-line">
            {pending.map((s) => (
              <li key={s.contactId} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(s.contactId)}
                  onChange={() => toggle(s.contactId)}
                  className="mt-[3px] h-3.5 w-3.5 shrink-0 accent-signal"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-[2px]">
                    <span className="text-[13px] font-medium text-ink-1">{s.contactName}</span>
                    <span className="text-[11.5px] text-ink-4">{s.contactRole}</span>
                    <span className="text-[11.5px] text-ink-5">·</span>
                    <span className="text-[12px] font-medium text-ink-2">{s.customerName}</span>
                  </div>
                  <div className="mt-[3px] inline-flex items-center gap-1 rounded bg-signal-soft px-2 py-[2px] text-[11px] font-medium text-signal-deep">
                    {s.reason}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleEnroll}
              disabled={enrolling || selected.size === 0}
              className="rounded-rect bg-ink-1 px-4 py-[7px] text-[12.5px] font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-40"
            >
              {enrolling ? 'Enrolling…' : `Enroll ${selected.size > 0 ? selected.size : ''} selected`}
            </button>
            <button
              onClick={() =>
                setSelected(new Set(pending.map((s) => s.contactId)))
              }
              className="text-[12px] text-ink-4 hover:text-ink-1"
            >
              Select all
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[12px] text-ink-4 hover:text-ink-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {enrolled.length > 0 && (
        <div>
          <div className="mb-2 text-[10.5px] font-medium uppercase tracking-eyebrow text-ink-4">
            Already enrolled
          </div>
          <ul className="flex flex-col divide-y divide-line rounded border border-line">
            {enrolled.map((s) => (
              <li
                key={s.contactId}
                className="flex items-center gap-3 px-4 py-3 opacity-60"
              >
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-good bg-good-soft text-[9px] text-good">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13px] font-medium text-ink-1">{s.contactName}</span>
                    <span className="text-[11.5px] text-ink-4">{s.contactRole}</span>
                    <span className="text-[11.5px] text-ink-5">·</span>
                    <span className="text-[12px] font-medium text-ink-2">{s.customerName}</span>
                  </div>
                  <div className="mt-[3px] text-[11px] text-ink-5">{s.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
