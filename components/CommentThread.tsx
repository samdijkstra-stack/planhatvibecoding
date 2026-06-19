'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Comment } from '@/lib/types';
import { TEAM_MEMBERS } from '@/lib/team';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Render a comment body, highlighting @mentions of known team members.
function renderBody(body: string) {
  const names = TEAM_MEMBERS.map((m) => m.name);
  // Build a regex that matches @Name for any known name.
  const pattern = new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));
    parts.push(
      <span key={key++} className="rounded bg-signal-soft px-[3px] font-medium text-signal-deep">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}

export function CommentThread({
  customerId,
  initialComments,
}: {
  customerId: string;
  initialComments: Comment[];
}) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setBody(v);
    // Show the mention picker when the last token starts with @
    const lastToken = v.slice(0, e.target.selectionStart).split(/\s/).pop() ?? '';
    setShowMentions(lastToken === '@');
  }

  function insertMention(name: string) {
    // Replace a trailing "@" with "@Name "
    setBody((prev) => prev.replace(/@$/, `@${name} `));
    setShowMentions(false);
    taRef.current?.focus();
  }

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setBody('');
        router.refresh();
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div>
      {comments.length === 0 ? (
        <p className="mb-4 text-[12.5px] text-ink-4">
          No comments yet. Start a thread and tag a teammate with @.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-4">
          {comments.map((cm) => (
            <li key={cm.id} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] bg-surface text-[10px] font-semibold text-ink-3">
                {initials(cm.author)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12.5px] font-medium text-ink-1">{cm.author}</span>
                  <span className="text-[11px] text-ink-5">{relTime(cm.created_at)}</span>
                </div>
                <div className="mt-[2px] text-[12.5px] leading-[1.55] text-ink-3">
                  {renderBody(cm.body)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <textarea
          ref={taRef}
          value={body}
          onChange={handleChange}
          rows={2}
          placeholder="Add a comment… type @ to tag a teammate"
          className="w-full resize-y rounded border border-line bg-white px-3 py-[8px] text-[12.5px] text-ink-1 placeholder:text-ink-5 focus:border-ink-3 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        {showMentions && (
          <div className="absolute bottom-full left-0 mb-1 w-[220px] overflow-hidden rounded border border-line bg-white shadow-md">
            {TEAM_MEMBERS.map((m) => (
              <button
                key={m.name}
                onClick={() => insertMention(m.name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-paper"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-surface text-[9px] font-semibold text-ink-3">
                  {m.initial}
                </span>
                <span className="text-[12px] font-medium text-ink-1">{m.name}</span>
                <span className="ml-auto text-[10.5px] text-ink-4">{m.role}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-ink-5">⌘+Enter to post</span>
          <button
            onClick={submit}
            disabled={posting || !body.trim()}
            className="rounded-rect bg-ink-1 px-4 py-[6px] text-[12px] font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-40"
          >
            {posting ? 'Posting…' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
