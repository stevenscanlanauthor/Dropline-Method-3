import { useCallback, useEffect, useState } from 'react';
import { apiAdmin } from '../lib/auth';
import { useAuth } from '../lib/auth-context';

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  isDisabled: boolean;
  createdAt: string;
  bookCount: number;
}

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiAdmin<AdminUser[]>('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(id: string, patch: Partial<{ isDisabled: boolean; isAdmin: boolean }>) {
    await apiAdmin(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete account ${email} and all their books?`)) return;
    await apiAdmin(`/admin/users/${id}`, { method: 'DELETE' });
    await load();
  }

  async function clearBooks(id: string, email: string) {
    if (!confirm(`Delete all Dropline books for ${email}?`)) return;
    await apiAdmin(`/admin/users/${id}/books`, { method: 'DELETE' });
    await load();
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <header className="app-chrome shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ink)]">Dropline Admin</h1>
          <p className="text-sm text-[var(--muted)]">Manage users and books</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--highlight)]">
            Back to app
          </a>
          <button type="button" onClick={() => void signOut()} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)]">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {loading && <p className="text-sm text-[var(--muted)]">Loading users…</p>}
        {error && <p className="text-sm text-[var(--danger)] mb-4">{error}</p>}

        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--ink)]">{u.email}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {u.displayName || 'No name'} · {u.bookCount} book{u.bookCount !== 1 ? 's' : ''}
                    {u.isDisabled && ' · Disabled'}
                    {u.isAdmin && ' · Admin'}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.id !== user.userId && (
                    <>
                      <button
                        type="button"
                        onClick={() => void patchUser(u.id, { isDisabled: !u.isDisabled })}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]"
                      >
                        {u.isDisabled ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void patchUser(u.id, { isAdmin: !u.isAdmin })}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]"
                      >
                        {u.isAdmin ? 'Remove admin' : 'Make admin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void clearBooks(u.id, u.email)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]"
                      >
                        Clear books
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUser(u.id, u.email)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--danger)] text-[var(--danger)]"
                      >
                        Delete user
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
