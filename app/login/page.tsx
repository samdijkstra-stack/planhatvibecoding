const ERROR_MESSAGES: Record<string, string> = {
  denied: 'Google sign-in was cancelled.',
  state: 'Security validation failed. Please try again.',
  exchange: 'Failed to complete sign-in with Google.',
  userinfo: 'Failed to retrieve account information.',
  noemail: 'Your Google account did not provide an email address.',
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function HatLogo() {
  return (
    <svg width="20" height="20" viewBox="5 35 461 244" fill="white" aria-hidden>
      <path d="M235.63,175.72c-127.38,0-230.63,25.14-230.63,51.57s103.26,51.57,230.63,51.57,230.63-25.14,230.63-51.57-103.26-51.57-230.63-51.57Z" />
      <path d="M361.64,153.89c0-74.55-45.25-118.41-126.01-118.41s-126.01,43.86-126.01,118.41c15.25-7.04,62.79-19.14,126.01-19.14s110.76,12.1,126.01,19.14Z" />
    </svg>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const errorKey = typeof searchParams.error === 'string' ? searchParams.error : null;
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-[340px]">
        <div className="mb-8 flex items-center gap-[10px]">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-ink-1">
            <HatLogo />
          </div>
          <span className="text-[15px] font-medium tracking-[-0.01em] text-ink-1">Planhat</span>
        </div>

        <h1 className="display mb-[6px] text-[24px] leading-[1.1] text-ink-1">Sign in</h1>
        <p className="mb-6 text-[13px] text-ink-4">Continue to your workspace</p>

        {errorKey && (
          <div className="mb-5 rounded border border-signal bg-signal-soft px-4 py-3 text-[12.5px] text-signal-deep">
            {ERROR_MESSAGES[errorKey] ?? 'An error occurred. Please try again.'}
          </div>
        )}

        {googleConfigured ? (
          <a
            href="/api/auth/login"
            className="flex w-full items-center justify-center gap-3 rounded-rect border border-line bg-white px-4 py-[10px] text-[13px] font-medium text-ink-1 shadow-sm transition-colors hover:bg-paper"
          >
            <GoogleIcon />
            Continue with Google
          </a>
        ) : (
          <div className="rounded border border-amber bg-amber-soft px-4 py-3 text-[12.5px] text-amber">
            Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in{' '}
            <code>.env.local</code> to enable sign-in.
          </div>
        )}

        <p className="mt-6 text-center text-[11.5px] text-ink-5">
          Access is restricted to authorized workspace members.
        </p>
      </div>
    </div>
  );
}
