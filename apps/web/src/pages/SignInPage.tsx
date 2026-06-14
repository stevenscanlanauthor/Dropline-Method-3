import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

export default function SignInPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'sign-in') {
        await login(email, password);
      } else {
        await register(email, password, displayName || undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3 mb-6">
          <img src={`${import.meta.env.BASE_URL}logo-dropline-icon.png`} alt="" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-semibold text-[var(--ink)]">Dropline</h1>
            <p className="text-sm text-[var(--muted)]">Sign in to your books</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className={`flex-1 py-2 text-sm rounded-lg border ${mode === 'sign-in' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)]'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-sm rounded-lg border ${mode === 'register' ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)]'}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Name (optional)</span>
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
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="field-input w-full mt-1"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full panel-header-action py-2.5 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
