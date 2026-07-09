import { useEffect, useRef, useState } from 'react';
import {
  apiBillingPublic,
  apiForgotPassword,
  apiResendVerification,
  EmailNotVerifiedError,
  EmailVerificationRequiredError,
  RateLimitError,
} from '../lib/auth';
import { useAuth } from '../lib/auth-context';

function searchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

export default function SignInPage() {
  const { login, register } = useAuth();
  const params = searchParams();
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('mode') === 'register' || params.get('code') || params.get('invite') ? 'register' : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState(
    (params.get('code') ?? params.get('invite') ?? '').toUpperCase(),
  );
  const [showOptionalCode, setShowOptionalCode] = useState(!!inviteCode);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotResetUrl, setForgotResetUrl] = useState<string | null>(null);

  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetSuccess = params.get('reset') === 'success';
  const verifiedSuccess = params.get('verified') === 'success';
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const showCodeField = mode === 'register' && (showOptionalCode || inviteCode.trim().length > 0);

  useEffect(() => {
    apiBillingPublic().then(c => setTrialDays(c.trialDays)).catch(() => {});
  }, []);

  useEffect(() => {
    if (lockedUntil === null) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockSecondsLeft(0);
        setError('');
        if (lockTimerRef.current) clearInterval(lockTimerRef.current);
      } else {
        setLockSecondsLeft(remaining);
      }
    };
    tick();
    lockTimerRef.current = setInterval(tick, 1000);
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, [lockedUntil]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResendSent(false);
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password, rememberMe);
      } else {
        await register(email, password, displayName || undefined, inviteCode.trim() || undefined);
        setVerificationPendingEmail(email.trim().toLowerCase());
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      if (err instanceof RateLimitError) {
        setLockedUntil(Date.now() + err.retryAfterSeconds * 1000);
        setError(err.message);
      } else if (err instanceof EmailVerificationRequiredError) {
        setVerificationPendingEmail(err.email);
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setError('');
      } else if (err instanceof EmailNotVerifiedError) {
        setVerificationPendingEmail(err.email);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      const { resetUrl } = await apiForgotPassword(forgotEmail.trim().toLowerCase());
      setForgotSent(true);
      setForgotResetUrl(resetUrl ?? null);
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResendVerification() {
    const target = verificationPendingEmail || email.trim().toLowerCase();
    if (!target) return;
    setResendLoading(true);
    try {
      await apiResendVerification(target);
      setResendSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend verification email');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] overflow-hidden">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <img src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`} alt="" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-semibold text-[var(--ink)]">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {mode === 'login'
                  ? 'Sign in to continue writing'
                  : `${trialDays}-day free trial, then lifetime access via the App Store`}
              </p>
            </div>
          </div>

          {resetSuccess && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-center">
              Password reset successfully. Sign in with your new password.
            </div>
          )}
          {verifiedSuccess && (
            <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-center">
              Email confirmed. You can sign in now.
            </div>
          )}
          {verificationPendingEmail && (
            <div className="mb-4 text-sm text-sky-900 bg-sky-50 border border-sky-200 rounded-md px-3 py-3 space-y-2">
              <p>
                We sent a confirmation link to <strong>{verificationPendingEmail}</strong>.
                Open it to activate your account, then sign in here.
              </p>
              {resendSent ? (
                <p className="text-xs text-sky-800">If that email is registered and not yet confirmed, a new link is on its way.</p>
              ) : (
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={() => void handleResendVerification()}
                  className="text-xs text-[var(--accent)] hover:underline font-medium disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend confirmation email'}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="text-sm text-[var(--muted)]">Display name (optional)</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="field-input w-full mt-1"
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field-input w-full mt-1"
                autoComplete="email"
              />
            </label>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">Password</span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(!showForgot);
                      setForgotSent(false);
                      setForgotEmail(email);
                    }}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field-input w-full mt-1"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'register' ? 'At least 8 characters' : undefined}
              />
            </div>

            {mode === 'login' && showForgot && (
              <div className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
                {forgotSent ? (
                  forgotResetUrl ? (
                    <div className="space-y-2">
                      <p className="text-sm text-amber-800">No email service configured yet. Use this link (expires in 15 minutes):</p>
                      <a href={forgotResetUrl} className="block text-xs text-[var(--accent)] underline break-all">{forgotResetUrl}</a>
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-700">If that email is registered, a reset link is on its way.</p>
                  )
                ) : (
                  <>
                    <p className="text-xs text-[var(--muted)]">Enter your email and we&apos;ll send a reset link.</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="field-input flex-1 min-w-0"
                        placeholder="you@example.com"
                      />
                      <button
                        type="button"
                        disabled={forgotLoading || !forgotEmail}
                        onClick={() => void handleForgot()}
                        className="shrink-0 panel-header-action px-3 py-2 text-sm disabled:opacity-50"
                      >
                        {forgotLoading ? 'Sending…' : 'Send link'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {mode === 'register' && (
              <>
                <label className="block">
                  <span className="text-sm text-[var(--muted)]">Confirm password</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="field-input w-full mt-1"
                    autoComplete="new-password"
                  />
                </label>
                {showCodeField ? (
                  <label className="block">
                    <span className="text-sm text-[var(--muted)]">Friend or invite code (optional)</span>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value.toUpperCase())}
                      className="field-input w-full mt-1"
                      placeholder="Friend or invite code"
                    />
                    <span className="text-xs text-[var(--muted)] mt-1 block">
                      Leave blank for a {trialDays}-day trial. A friend code can grant lifetime free access.
                    </span>
                  </label>
                ) : (
                  <button type="button" onClick={() => setShowOptionalCode(true)} className="text-sm text-[var(--accent)] hover:underline">
                    Have a friend or invite code?
                  </button>
                )}
              </>
            )}

            {mode === 'login' && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--ink)]">Remember me for 30 days</span>
              </label>
            )}

            {isLocked ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                <p className="font-medium">Account temporarily locked</p>
                <p className="mt-0.5">
                  Too many failed attempts. Try again in{' '}
                  {lockSecondsLeft >= 60
                    ? `${Math.ceil(lockSecondsLeft / 60)} minute${Math.ceil(lockSecondsLeft / 60) !== 1 ? 's' : ''}`
                    : `${lockSecondsLeft} second${lockSecondsLeft !== 1 ? 's' : ''}`}.
                </p>
              </div>
            ) : error ? (
              <p className="text-sm text-[var(--danger)] bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full panel-header-action py-2.5 disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 bg-[var(--surface-muted)] border-t border-[var(--border)] text-center text-sm text-[var(--muted)]">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setShowForgot(false); }}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
