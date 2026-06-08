'use client';
import { useState } from 'react';

export default function SlackAlertButton({ customerId }: { customerId: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'fallback'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    setStatus('sending');
    setMessage(null);
    try {
      const res = await fetch('/api/alerts/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('idle');
        setMessage(data.error ?? `Failed: ${res.status}`);
        return;
      }
      setStatus(data.sent ? 'sent' : 'fallback');
      setMessage(data.message ?? null);
    } catch (e) {
      setStatus('idle');
      setMessage(String(e));
    }
  }

  const label =
    status === 'sending'
      ? 'Sending…'
      : status === 'sent'
      ? 'Slack alert sent'
      : status === 'fallback'
      ? 'Logged to console'
      : 'Send Slack alert';

  return (
    <div className="flex flex-col items-end gap-[6px]">
      <button
        type="button"
        onClick={send}
        disabled={status === 'sending'}
        className="rounded-rect bg-ink-1 px-3 py-[6px] text-[11.5px] font-medium uppercase tracking-eyebrow text-white transition-colors duration-100 hover:bg-ink-2 disabled:opacity-60"
      >
        {label}
      </button>
      {message && (
        <span className="max-w-[260px] text-right text-[10.5px] text-ink-4">{message}</span>
      )}
    </div>
  );
}
