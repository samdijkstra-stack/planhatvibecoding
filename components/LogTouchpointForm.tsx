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
    <form onSubmit={submit} className="card p-4">
      <div className="mb-3 text-sm font-semibold text-ink-900">Log a touchpoint</div>
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="label">Type</label>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`chip cursor-pointer capitalize ${
                  type === t
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="author">
            Author
          </label>
          <input
            id="author"
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
          />
        </div>
      </div>
      <div className="mb-3">
        <label className="label" htmlFor="text">
          Notes
        </label>
        <textarea
          id="text"
          className="input min-h-[88px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened? Any next steps?"
          disabled={submitting}
        />
      </div>
      {error && <div className="mb-3 text-sm text-bad-700">{error}</div>}
      <div className="flex items-center justify-end gap-2">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Log touchpoint'}
        </button>
      </div>
    </form>
  );
}
