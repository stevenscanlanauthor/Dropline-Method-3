import { useState } from 'react';
import { apiResetPassword } from '../lib/auth';

export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] px-4">
        <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-4">
          <img src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`} alt="" className="h-10 w-10 mx-auto" />
          <h1 className="text-xl font-semibold">Invalid reset link</h1>
          <p className="text-sm text-[var(--muted)]">This reset link is missing or malformed. Please request a new one.</p>
          <a href="/sign-in" className="block w-full panel-header-action py-2.5">Back to sign in</a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword(token, newPassword);
      window.location.href = '/sign-in?reset=success';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-md)]">
        <div className="px-8 pt-8 pb-6">
          <div className="flex justify-center mb-5">
            <img src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`} alt="" className="h-10 w-10" />
          </div>
          <h1 className="text-xl font-semibold text-center">Choose a new password</h1>
          <p className="text-sm text-[var(--muted)] text-center mt-1">At least 8 characters.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm text-[var(--muted)]">New password</span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="field-input w-full mt-1"
                autoComplete="new-password"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Confirm new password</span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="field-input w-full mt-1"
                autoComplete="new-password"
              />
            </label>
            {error && <p className="text-sm text-[var(--danger)] bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading || !newPassword || !confirmPassword} className="w-full panel-header-action py-2.5 disabled:opacity-50">
              {loading ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
        <div className="px-8 py-4 bg-[var(--surface-muted)] border-t border-[var(--border)] text-center">
          <a href="/sign-in" className="text-sm text-[var(--accent)] hover:underline font-medium">Back to sign in</a>
        </div>
      </div>
    </div>
  );
}
