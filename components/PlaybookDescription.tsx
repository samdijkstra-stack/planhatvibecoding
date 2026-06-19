'use client';
import { useState, useRef } from 'react';

interface Props {
  playbookId: string;
  initial: string;
}

export function PlaybookDescription({ playbookId, initial }: Props) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    setStatus('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(e.target.value), 1200);
  }

  async function save(text: string) {
    setStatus('saving');
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/description`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });
      setStatus(res.ok ? 'saved' : 'error');
      if (res.ok) setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="border-b border-line px-8 py-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12.5px] font-medium text-ink-1">Description</div>
        <span className="text-[11px] text-ink-5">
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && '✓ Saved'}
          {status === 'error' && '✗ Save failed'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        rows={10}
        className="w-full resize-y rounded border border-line bg-paper px-3 py-[10px] text-[13px] leading-[1.7] text-ink-1 placeholder:text-ink-5 focus:border-ink-3 focus:outline-none"
        placeholder="Describe what this playbook does, when it fires, and why it matters…"
      />
      <p className="mt-2 text-[11px] text-ink-5">Auto-saves as you type. Plain text.</p>
    </section>
  );
}
