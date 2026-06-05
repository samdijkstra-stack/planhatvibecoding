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

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={send}
        disabled={status === 'sending'}
        className="btn-danger"
      >
        {status === 'sending'
          ? 'Sending…'
          : status === 'sent'
          ? '✓ Slack alert sent'
          : status === 'fallback'
          ? '✓ Logged to console'
          : '🚨 Send Slack alert'}
      </button>
      {message && (
        <span className="max-w-xs text-right text-xs text-ink-500">{message}</span>
      )}
    </div>
  );
}
