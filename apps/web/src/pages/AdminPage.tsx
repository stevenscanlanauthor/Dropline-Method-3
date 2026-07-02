import { useCallback, useEffect, useState } from 'react';
import { apiAdmin } from '../lib/auth';
import { useAuth } from '../lib/auth-context';

type Tab = 'users' | 'login-events' | 'security';

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  isDisabled: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  bookCount: number;
}

interface LoginEvent {
  id: string;
  userId?: string | null;
  emailAttempted: string;
  ipAddress: string;
  succeeded: boolean;
  createdAt: string;
}

interface BlockedIp {
  ip: string;
  note: string | null;
  blockedAt: string;
}

interface AdminAlert {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function activeLabel(iso: string | null): string {
  if (!iso) return 'Never signed in';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins <= 5) return 'Online now';
  if (mins < 60) return `Active ${mins}m ago`;
  return `Last seen ${fmtDate(iso)}`;
}

function LoginHistory({ userId }: { userId: string }) {
  const [events, setEvents] = useState<LoginEvent[] | null>(null);
  useEffect(() => {
    void apiAdmin<LoginEvent[]>(`/admin/users/${userId}/login-history`).then(setEvents).catch(() => setEvents([]));
  }, [userId]);
  if (!events) return <p className="text-xs text-[var(--muted)] py-2">Loading login history…</p>;
  if (events.length === 0) return <p className="text-xs text-[var(--muted)] py-2">No login events yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
            <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">When</th>
            <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">IP</th>
            <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Result</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(ev.createdAt)}</td>
              <td className="px-3 py-2 font-mono">{ev.ipAddress}</td>
              <td className="px-3 py-2">{ev.succeeded ? 'Success' : 'Failed'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [mode, setMode] = useState<'active' | 'all'>('all');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const path = mode === 'active' ? '/admin/users' : '/admin/users/all';
      setUsers(await apiAdmin<AdminUser[]>(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);

  async function patchUser(id: string, patch: Partial<{ isDisabled: boolean; isAdmin: boolean }>) {
    await apiAdmin(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    await load();
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete account ${email} and all their books? This cannot be undone.`)) return;
    await apiAdmin(`/admin/users/${id}`, { method: 'DELETE' });
    await load();
  }

  async function clearBooks(id: string, email: string) {
    if (!confirm(`Delete all Dropline books for ${email}?`)) return;
    await apiAdmin(`/admin/users/${id}/books`, { method: 'DELETE' });
    await load();
  }

  async function unlockUser(id: string) {
    await apiAdmin('/admin/login-lockouts/clear', { method: 'POST', body: JSON.stringify({ userId: id }) });
    alert('Sign-in lockout cleared for this user.');
  }

  async function submitReset() {
    if (!resetUser || newPassword.length < 8) return;
    await apiAdmin(`/admin/users/${resetUser.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPassword }),
    });
    setResetUser(null);
    setNewPassword('');
    alert('Password reset. User must sign in again.');
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setMode('active')} className={`text-sm px-3 py-1.5 rounded-lg border ${mode === 'active' ? 'bg-[var(--ink)] text-[var(--surface)]' : 'border-[var(--border)]'}`}>Active (15m)</button>
        <button type="button" onClick={() => setMode('all')} className={`text-sm px-3 py-1.5 rounded-lg border ${mode === 'all' ? 'bg-[var(--ink)] text-[var(--surface)]' : 'border-[var(--border)]'}`}>All users</button>
        <button type="button" onClick={() => void load()} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] ml-auto">Refresh</button>
      </div>
      {loading && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}
      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <button type="button" className="w-full text-left" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-[var(--ink)]">{u.email}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {u.displayName || 'No name'} · {u.bookCount} book{u.bookCount !== 1 ? 's' : ''}
                    {u.isDisabled && ' · Disabled'}
                    {u.isAdmin && ' · Admin'}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Joined {fmtDate(u.createdAt)} · {activeLabel(u.lastActiveAt)}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">{expanded === u.id ? '▲' : '▼'}</span>
              </div>
            </button>
            {expanded === u.id && (
              <>
                <LoginHistory userId={u.id} />
                {u.id !== currentUserId && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button type="button" onClick={() => void patchUser(u.id, { isDisabled: !u.isDisabled })} className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]">{u.isDisabled ? 'Enable' : 'Disable'}</button>
                    <button type="button" onClick={() => void patchUser(u.id, { isAdmin: !u.isAdmin })} className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]">{u.isAdmin ? 'Remove admin' : 'Make admin'}</button>
                    <button type="button" onClick={() => { setResetUser(u); setNewPassword(''); }} className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]">Reset password</button>
                    <button type="button" onClick={() => void unlockUser(u.id)} className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]">Unlock sign-in</button>
                    <button type="button" onClick={() => void clearBooks(u.id, u.email)} className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--border)]">Clear books</button>
                    <button type="button" onClick={() => void deleteUser(u.id, u.email)} className="text-xs px-2.5 py-1.5 rounded-md border border-[var(--danger)] text-[var(--danger)]">Delete user</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {resetUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 max-w-sm w-full">
            <h3 className="font-semibold text-[var(--ink)] mb-2">Reset password</h3>
            <p className="text-sm text-[var(--muted)] mb-3">{resetUser.email}</p>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8)" className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm mb-4" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setResetUser(null)} className="flex-1 text-sm py-2 rounded-lg border border-[var(--border)]">Cancel</button>
              <button type="button" disabled={newPassword.length < 8} onClick={() => void submitReset()} className="flex-1 text-sm py-2 rounded-lg bg-[var(--ink)] text-[var(--surface)] disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginEventsTab() {
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [search, setSearch] = useState('');
  const [blocked, setBlocked] = useState<BlockedIp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
      const [ev, ips] = await Promise.all([
        apiAdmin<LoginEvent[]>(`/admin/login-events${q}`),
        apiAdmin<BlockedIp[]>('/admin/blocked-ips'),
      ]);
      setEvents(ev);
      setBlocked(ips);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function unlockRow(email: string, ip: string) {
    await apiAdmin('/admin/login-lockouts/clear', { method: 'POST', body: JSON.stringify({ email, ip }) });
    await load();
  }

  async function blockIp(ip: string) {
    await apiAdmin('/admin/blocked-ips', { method: 'POST', body: JSON.stringify({ ip }) });
    await load();
  }

  async function unblockIp(ip: string) {
    await apiAdmin(`/admin/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' });
    await load();
  }

  const blockedSet = new Set(blocked.map(b => b.ip));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email or IP…" className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-sm" />
        <button type="button" onClick={() => void load()} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)]">Refresh</button>
      </div>
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">When</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Email</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">IP</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Result</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id} className={`border-b border-[var(--border)] last:border-0 ${!ev.succeeded ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtDateTime(ev.createdAt)}</td>
                  <td className="px-3 py-2">{ev.emailAttempted}</td>
                  <td className="px-3 py-2 font-mono text-xs">{ev.ipAddress}</td>
                  <td className="px-3 py-2">{ev.succeeded ? 'Success' : 'Failed'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {!ev.succeeded && (
                        <button type="button" onClick={() => void unlockRow(ev.emailAttempted, ev.ipAddress)} className="text-xs px-2 py-1 rounded border border-[var(--border)]">Unlock</button>
                      )}
                      {blockedSet.has(ev.ipAddress) ? (
                        <button type="button" onClick={() => void unblockIp(ev.ipAddress)} className="text-xs px-2 py-1 rounded border border-[var(--border)]">Unblock IP</button>
                      ) : (
                        <button type="button" onClick={() => void blockIp(ev.ipAddress)} className="text-xs px-2 py-1 rounded border border-[var(--danger)] text-[var(--danger)]">Block IP</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [unknown, setUnknown] = useState<LoginEvent[]>([]);
  const [blocked, setBlocked] = useState<BlockedIp[]>([]);

  const load = useCallback(async () => {
    const [a, u, b] = await Promise.all([
      apiAdmin<AdminAlert[]>('/admin/alerts'),
      apiAdmin<LoginEvent[]>('/admin/login-events/unknown'),
      apiAdmin<BlockedIp[]>('/admin/blocked-ips'),
    ]);
    setAlerts(a);
    setUnknown(u);
    setBlocked(b);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function dismiss(id: string) {
    await apiAdmin(`/admin/alerts/${id}/read`, { method: 'POST' });
    await load();
  }

  async function dismissAll() {
    await apiAdmin('/admin/alerts/read-all', { method: 'POST' });
    await load();
  }

  async function unblockIp(ip: string) {
    await apiAdmin(`/admin/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' });
    await load();
  }

  const unread = alerts.filter(a => !a.isRead);

  return (
    <div className="space-y-6">
      {unread.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-[var(--ink)]">Security alerts</h3>
            <button type="button" onClick={() => void dismissAll()} className="text-xs px-2 py-1 rounded border border-[var(--border)]">Dismiss all</button>
          </div>
          {unread.map(a => (
            <div key={a.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3 flex justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-900">{a.type}</p>
                <p className="text-sm text-amber-800">{a.message}</p>
                <p className="text-xs text-amber-700 mt-1">{fmtDateTime(a.createdAt)}</p>
              </div>
              <button type="button" onClick={() => void dismiss(a.id)} className="text-xs px-2 py-1 h-fit rounded border border-amber-400">Dismiss</button>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="font-semibold text-[var(--ink)] mb-2">Blocked IPs</h3>
        {blocked.length === 0 ? <p className="text-sm text-[var(--muted)]">No blocked IPs.</p> : (
          <div className="space-y-2">
            {blocked.map(b => (
              <div key={b.ip} className="flex justify-between items-center rounded-lg border border-[var(--border)] px-3 py-2">
                <span className="font-mono text-sm">{b.ip}</span>
                <button type="button" onClick={() => void unblockIp(b.ip)} className="text-xs px-2 py-1 rounded border border-[var(--border)]">Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-[var(--ink)] mb-2">Unknown login attempts</h3>
        {unknown.length === 0 ? <p className="text-sm text-[var(--muted)]">None recorded.</p> : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {unknown.map(ev => (
                  <tr key={ev.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 text-xs">{fmtDateTime(ev.createdAt)}</td>
                    <td className="px-3 py-2">{ev.emailAttempted}</td>
                    <td className="px-3 py-2 font-mono text-xs">{ev.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function tabFromUrl(): Tab {
  const t = new URLSearchParams(window.location.search).get('tab');
  if (t === 'login-events' || t === 'security') return t;
  return 'users';
}

export default function AdminPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>(tabFromUrl);

  function selectTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState({}, '', url.pathname + url.search);
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Admin access required.
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'users', label: 'Users' },
    { id: 'login-events', label: 'Login Attempts' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]">
      <header className="app-chrome shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
        <div>
          <h1 className="text-lg font-semibold text-[var(--ink)]">Dropline Admin</h1>
          <p className="text-sm text-[var(--muted)]">Users, login security, and alerts</p>
        </div>
        <div className="flex gap-2">
          <a href="/" className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--highlight)]">Back to app</a>
          <button type="button" onClick={() => void signOut()} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)]">Sign out</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex gap-2 mb-6 border-b border-[var(--border)] pb-2">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`text-sm px-3 py-1.5 rounded-lg ${tab === t.id ? 'bg-[var(--ink)] text-[var(--surface)]' : 'text-[var(--muted)] hover:bg-[var(--highlight)]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab currentUserId={user.userId} />}
        {tab === 'login-events' && <LoginEventsTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
