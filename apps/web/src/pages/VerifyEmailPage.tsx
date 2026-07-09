import { useEffect, useState } from 'react';
import { apiResendVerification, apiVerifyEmail } from '../lib/auth';

export default function VerifyEmailPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const errorParam = params.get('error');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    errorParam ? 'error' : token ? 'loading' : 'error',
  );
  const [message, setMessage] = useState(
    errorParam === 'missing'
      ? 'This verification link is missing or malformed.'
      : errorParam
        ? decodeURIComponent(errorParam)
        : token
          ? ''
          : 'This verification link is missing or malformed.',
  );
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token || errorParam) return;
    let cancelled = false;
    void (async () => {
      try {
        const { email } = await apiVerifyEmail(token);
        if (cancelled) return;
        setVerifiedEmail(email);
        setStatus('success');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Something went wrong');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, errorParam]);

  async function handleResend() {
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    try {
      await apiResendVerification(resendEmail.trim().toLowerCase());
      setResendSent(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not resend verification email');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-md)]">
        <div className="flex justify-center mb-5">
          <img src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`} alt="Dropline" className="h-10 w-10" />
        </div>

        {status === 'loading' && (
          <>
            <h1 className="text-xl font-semibold text-center">Confirming your email…</h1>
            <p className="text-sm text-[var(--muted)] text-center mt-2">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-xl font-semibold text-center">Email confirmed</h1>
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-center mt-4">
              {verifiedEmail ? `${verifiedEmail} is verified. You can sign in now.` : 'Your email is verified. You can sign in now.'}
            </p>
            <a href="/sign-in" className="block w-full mt-6 text-center panel-header-action py-2.5">
              Sign in
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-center">Could not verify email</h1>
            <p className="text-sm text-[var(--danger)] bg-red-50 border border-red-200 rounded-md px-3 py-2 text-center mt-4">{message}</p>
            {resendSent ? (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-center mt-4">
                If that email is registered and not yet confirmed, a new link is on its way.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-xs text-[var(--muted)] text-center">Enter your email to receive a new confirmation link.</p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field-input w-full"
                />
                <button
                  type="button"
                  disabled={resendLoading || !resendEmail.trim()}
                  onClick={() => void handleResend()}
                  className="w-full panel-header-action py-2.5 disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend confirmation email'}
                </button>
              </div>
            )}
            <a href="/sign-in" className="block text-center mt-4 text-sm text-[var(--accent)] hover:underline font-medium">
              Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
