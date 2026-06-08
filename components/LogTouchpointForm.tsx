'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Activity } from '@/lib/types';

const TYPES: Activity['type'][] = ['note', 'call', 'email', 'meeting'];

export default function LogTouchpointForm({
  customerId,
  defaultAuthor,
}: {
  customerId: string;
  defaultAuthor: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<Activity['type']>('note');
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(defaultAuthor);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError('Add some text first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text: text.trim(), author: author.trim() || 'Unknown' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      setText('');
      router.refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded border border-line bg-paper px-[18px] py-4"
    >
      <div className="mb-[10px] text-[11.5px] font-medium text-ink-2">Log a touchpoint</div>

      <div className="mb-[10px] flex flex-wrap gap-[5px]">
        {TYPES.map((t) => {
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="cursor-pointer rounded-rect px-[11px] py-1 text-[11.5px] capitalize transition-colors duration-100"
              style={{
                border: `1px solid ${active ? '#1f1f1f' : '#e5e5e5'}`,
                background: active ? '#0a0a0a' : '#ffffff',
                color: active ? '#ffffff' : '#595959',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <input
        className="mb-2 w-full rounded-[3px] border border-line bg-white px-[10px] py-2 text-[12.5px] text-ink-1 placeholder:text-ink-5 focus:border-ink-2 focus:outline-none"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Author"
      />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add notes…"
        className="min-h-14 w-full resize-y rounded-[3px] border border-line bg-white px-[10px] py-2 text-[12.5px] leading-[1.5] text-ink-1 placeholder:text-ink-5 focus:border-ink-2 focus:outline-none"
        disabled={submitting}
      />

      {error && <div className="mt-2 text-[11.5px] text-signal">{error}</div>}

      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-rect bg-signal px-4 py-[6px] text-[12.5px] font-medium text-white transition-colors duration-100 hover:bg-signal-deep disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Log touchpoint'}
        </button>
      </div>
    </form>
  );
}
