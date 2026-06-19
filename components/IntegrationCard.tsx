'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IntegrationStatus } from '@/lib/integrations';

interface Props {
  provider: string;
  name: string;
  description: string;
  color: string;
  initial: string;
  placeholder?: string;
  status: IntegrationStatus;
  encryptionReady: boolean;
  oauthProvider?: boolean;
  oauthConfigured?: boolean;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function IntegrationCard({
  provider,
  name,
  description,
  color,
  initial,
  placeholder,
  status,
  encryptionReady,
  oauthProvider,
  oauthConfigured,
}: Props) {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    detail?: string;
    error?: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!token.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/integrations/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken('');
        setEntering(false);
        router.refresh();
      } else {
        setSaveError(data.error ?? 'Failed to save');
      }
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      router.refresh();
    } catch (err) {
      setTestResult({ ok: false, error: String(err) });
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/integrations/${provider}`, { method: 'DELETE' });
      setTestResult(null);
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <article className="border-b border-line px-8 py-6 last:border-b-0">
      <div className="flex items-start gap-5">
        {/* Provider icon */}
        <div
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[6px] text-[16px] font-bold text-white"
          style={{ background: color }}
          aria-hidden
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header: name + status badge */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-[14px] font-semibold text-ink-1">{name}</span>
            <span
              className={[
                'inline-flex shrink-0 items-center gap-[5px] rounded-rect px-[7px] py-[2px] text-[10px] font-medium uppercase tracking-[0.07em]',
                status.connected ? 'bg-good-soft text-good' : 'bg-surface text-ink-4',
              ].join(' ')}
            >
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: status.connected ? '#2a9c5e' : '#b8b8b8' }}
              />
              {status.connected ? 'Connected' : 'Not connected'}
            </span>
          </div>

          {/* Description */}
          <p className="mt-[5px] text-[12.5px] leading-[1.55] text-ink-3">{description}</p>

          {/* ── Connected state ── */}
          {status.connected && (
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11.5px] text-ink-2">
                  {status.email ?? status.maskedHint ?? '—'}
                </span>
                {status.lastTestedAt && (
                  <span className="text-[11px] text-ink-4">
                    {'· Tested '}
                    {relativeTime(status.lastTestedAt)}
                    {status.lastTestOk === true
                      ? ' ✓'
                      : status.lastTestOk === false
                      ? ' ✗'
                      : ''}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="rounded-rect border border-line bg-white px-3 py-[5px] text-[12px] text-ink-3 transition-colors hover:bg-paper disabled:opacity-50"
                >
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-rect border border-line bg-white px-3 py-[5px] text-[12px] text-ink-4 transition-colors hover:border-signal hover:text-signal disabled:opacity-50"
                >
                  {disconnecting ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          )}

          {/* ── Disconnected: OAuth (Gmail) ── */}
          {!status.connected && oauthProvider && (
            <div className="mt-4">
              {!oauthConfigured ? (
                <p className="text-[11.5px] text-ink-4">
                  Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and{' '}
                  <code>GOOGLE_REDIRECT_URI</code> in <code>.env.local</code> to enable.
                </p>
              ) : !encryptionReady ? (
                <p className="text-[11.5px] text-ink-4">
                  Set <code>APP_ENCRYPTION_KEY</code> to enable this integration.
                </p>
              ) : (
                <a
                  href="/api/integrations/gmail/authorize"
                  className="inline-flex items-center gap-[6px] rounded-rect border border-line bg-white px-3 py-[6px] text-[12px] text-ink-2 transition-colors hover:bg-paper"
                >
                  Connect with Google ↗
                </a>
              )}
            </div>
          )}

          {/* ── Disconnected: token/key (Slack, Attio) ── */}
          {!status.connected && !oauthProvider && (
            <div className="mt-4">
              {!encryptionReady ? (
                <p className="text-[11.5px] text-ink-4">
                  Set <code>APP_ENCRYPTION_KEY</code> to enable this integration.
                </p>
              ) : entering ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={placeholder ?? 'Paste token…'}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      autoFocus
                      className="flex-1 rounded border border-line bg-white px-3 py-[5px] font-mono text-[12px] text-ink-1 placeholder:font-sans placeholder:text-ink-5 focus:border-ink-3 focus:outline-none"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving || !token.trim()}
                      className="rounded-rect bg-ink-1 px-3 py-[6px] text-[12px] font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-40"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEntering(false);
                        setToken('');
                        setSaveError(null);
                      }}
                      className="rounded-rect border border-line bg-white px-3 py-[6px] text-[12px] text-ink-3 transition-colors hover:bg-paper"
                    >
                      Cancel
                    </button>
                  </div>
                  {saveError && (
                    <p className="mt-2 text-[11.5px] text-signal">{saveError}</p>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setEntering(true)}
                  className="text-[12px] text-ink-3 underline-offset-2 hover:text-ink-1 hover:underline"
                >
                  Connect ↗
                </button>
              )}
            </div>
          )}

          {/* Test result feedback */}
          {testResult && (
            <p
              className="mt-3 text-[12px] font-medium"
              style={{ color: testResult.ok ? '#2a9c5e' : '#f06a2a' }}
            >
              {testResult.ok
                ? `✓ ${testResult.detail ?? 'Connection verified'}`
                : `✗ ${testResult.error ?? 'Connection failed'}`}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
