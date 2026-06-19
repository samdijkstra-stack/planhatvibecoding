import { getIntegrationStatus } from '@/lib/integrations';
import { IntegrationCard } from '@/components/IntegrationCard';

export const dynamic = 'force-dynamic';

const ERROR_MESSAGES: Record<string, string> = {
  gmail_denied: 'Google authorization was denied. Please try again.',
  gmail_state_mismatch: 'OAuth state validation failed — possible CSRF. Please try again.',
  gmail_exchange_failed: 'Failed to exchange the authorization code with Google. Please try again.',
};

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [slackStatus, attioStatus, gmailStatus] = await Promise.all([
    getIntegrationStatus('slack'),
    getIntegrationStatus('attio'),
    getIntegrationStatus('gmail'),
  ]);

  const encryptionReady = Boolean(process.env.APP_ENCRYPTION_KEY);
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );

  const successKey = typeof searchParams.success === 'string' ? searchParams.success : null;
  const errorKey = typeof searchParams.error === 'string' ? searchParams.error : null;

  return (
    <div>
      {/* OAuth feedback banners */}
      {successKey === 'gmail' && (
        <div className="mx-8 mt-5 rounded border border-good bg-good-soft px-4 py-3 text-[12.5px] text-good">
          ✓ Gmail connected successfully.
        </div>
      )}
      {errorKey && (
        <div className="mx-8 mt-5 rounded border border-signal bg-signal-soft px-4 py-3 text-[12.5px] text-signal-deep">
          {ERROR_MESSAGES[errorKey] ?? 'An unexpected error occurred. Please try again.'}
        </div>
      )}

      {/* Encryption key warning */}
      {!encryptionReady && (
        <div className="mx-8 mt-5 rounded border border-amber bg-amber-soft px-4 py-3 text-[12.5px] text-amber">
          <strong>APP_ENCRYPTION_KEY not configured.</strong> Credentials cannot be saved until this
          is set. Generate one:{' '}
          <code className="text-[11px]">
            node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;base64&apos;))&quot;
          </code>
        </div>
      )}

      <div className="mt-2 border-t border-line">
        <IntegrationCard
          provider="slack"
          name="Slack"
          description="Deliver churn alerts and CSM notifications via a Slack bot. Requires a bot token (xoxb-…) from a Slack app with the chat:write scope."
          color="#4A154B"
          initial="S"
          placeholder="xoxb-…"
          status={slackStatus}
          encryptionReady={encryptionReady}
        />
        <IntegrationCard
          provider="attio"
          name="Attio"
          description="Sync customer health data and activities with your Attio CRM workspace. Requires an Attio API access token from workspace settings."
          color="#1d3557"
          initial="A"
          placeholder="Paste your Attio access token…"
          status={attioStatus}
          encryptionReady={encryptionReady}
        />
        <IntegrationCard
          provider="gmail"
          name="Gmail"
          description="Send emails and access your inbox directly from Planhat. Uses Google OAuth 2.0 — only an encrypted refresh token is stored, never your password."
          color="#EA4335"
          initial="G"
          status={gmailStatus}
          encryptionReady={encryptionReady}
          oauthProvider
          oauthConfigured={googleConfigured}
        />
      </div>

      <section className="border-t border-line px-8 py-5">
        <div className="eyebrow-sm mb-3">Security notes</div>
        <ul className="flex flex-col gap-[7px]">
          {[
            'Credentials are encrypted with AES-256-GCM before storage. The encryption key lives only in your environment variables, never in source code.',
            'Decrypted secrets are never logged, never sent to the client, and only leave the server to call the relevant provider API.',
            'For Gmail, only a refresh token is stored. Access tokens are derived on demand and discarded after each use.',
            'Disconnecting a provider immediately deletes the encrypted record from the database.',
          ].map((note) => (
            <li key={note} className="flex items-start gap-2 text-[12px] text-ink-4">
              <span className="mt-[2px] shrink-0 text-ink-5">—</span>
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
