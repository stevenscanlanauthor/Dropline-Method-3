import { useEffect, useRef, useState } from 'react';
import {
  apiChangeEmail,
  apiChangePassword,
  apiDeleteAccount,
  apiLoginEvents,
} from '../lib/auth';
import { useAuth } from '../lib/auth-context';
import { useAdminAlertCount } from '../lib/useAdminAlertCount';

export default function ProfileMenu({
  billingLabel,
  billingTitle,
}: {
  billingLabel: string;
  billingTitle?: string;
}) {
  const { user, signOut, refreshUser, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<'password' | 'email' | 'history' | 'delete' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const adminAlertCount = useAdminAlertCount(!!user?.isAdmin);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-muted)] max-w-[12rem] truncate"
        title={user.email}
      >
        {user.displayName || user.email}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] z-50 py-1 text-sm">
          <div className="px-3 py-2 text-xs text-[var(--muted)] border-b border-[var(--border)] truncate">{user.email}</div>
          {user.isAdmin && (
            <a
              href={adminAlertCount > 0 ? '/admin?tab=security' : '/admin'}
              className="flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-muted)]"
            >
              <span>Admin Panel</span>
              {adminAlertCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {adminAlertCount > 99 ? '99+' : adminAlertCount}
                </span>
              )}
            </a>
          )}
          <a href="/billing" className="block px-3 py-2 hover:bg-[var(--surface-muted)]" title={billingTitle}>
            Billing & plan ({billingLabel})
          </a>
          <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)]" onClick={() => { setModal('email'); setOpen(false); }}>
            Change Email
          </button>
          <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)]" onClick={() => { setModal('password'); setOpen(false); }}>
            Change Password
          </button>
          <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)]" onClick={() => { setModal('history'); setOpen(false); }}>
            Login History
          </button>
          <a href="/support" className="block px-3 py-2 hover:bg-[var(--surface-muted)]">Support</a>
          <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)] text-[var(--danger)]" onClick={() => { setModal('delete'); setOpen(false); }}>
            Delete Account
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-[var(--surface-muted)] border-t border-[var(--border)]"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      )}

      {modal === 'password' && (
        <ChangePasswordModal onClose={() => setModal(null)} />
      )}
      {modal === 'email' && (
        <ChangeEmailModal
          onClose={() => setModal(null)}
          onDone={async () => {
            await refreshUser();
            setModal(null);
          }}
        />
      )}
      {modal === 'history' && <LoginHistoryModal onClose={() => setModal(null)} />}
      {modal === 'delete' && (
        <DeleteAccountModal
          email={user.email}
          onClose={() => setModal(null)}
          onDeleted={() => {
            setUser(null);
            window.location.href = '/sign-in';
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <ModalShell title="Change password" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          setLoading(true);
          setError('');
          void apiChangePassword(currentPassword, newPassword)
            .then(onClose)
            .catch(err => setError(err instanceof Error ? err.message : 'Failed'))
            .finally(() => setLoading(false));
        }}
      >
        <input type="password" required placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="field-input w-full" />
        <input type="password" required minLength={8} placeholder="New password (8+)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="field-input w-full" />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" disabled={loading} className="w-full panel-header-action py-2 disabled:opacity-50">{loading ? 'Saving…' : 'Update password'}</button>
      </form>
    </ModalShell>
  );
}

function ChangeEmailModal({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <ModalShell title="Change email" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          setLoading(true);
          setError('');
          setInfo('');
          void apiChangeEmail(currentPassword, newEmail)
            .then(async result => {
              if (result.emailVerificationRequired) {
                setInfo('Email updated. Confirm the new address before signing in again.');
              }
              await onDone();
            })
            .catch(err => setError(err instanceof Error ? err.message : 'Failed'))
            .finally(() => setLoading(false));
        }}
      >
        <input type="password" required placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="field-input w-full" />
        <input type="email" required placeholder="New email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="field-input w-full" />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}
        <button type="submit" disabled={loading} className="w-full panel-header-action py-2 disabled:opacity-50">{loading ? 'Saving…' : 'Update email'}</button>
      </form>
    </ModalShell>
  );
}

function LoginHistoryModal({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<Awaited<ReturnType<typeof apiLoginEvents>> | null>(null);
  useEffect(() => {
    void apiLoginEvents().then(setEvents).catch(() => setEvents([]));
  }, []);
  return (
    <ModalShell title="Login history" onClose={onClose}>
      {!events && <p className="text-sm text-[var(--muted)]">Loading…</p>}
      {events && events.length === 0 && <p className="text-sm text-[var(--muted)]">No login events yet.</p>}
      {events && events.length > 0 && (
        <div className="max-h-64 overflow-y-auto text-xs space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="flex justify-between gap-2 border-b border-[var(--border)] pb-1">
              <span>{new Date(ev.createdAt).toLocaleString()}</span>
              <span className="font-mono">{ev.ipAddress}</span>
              <span>{ev.succeeded ? 'OK' : 'Failed'}</span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function DeleteAccountModal({
  email,
  onClose,
  onDeleted,
}: {
  email: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <ModalShell title="Delete account" onClose={onClose}>
      <p className="text-sm text-[var(--muted)] mb-3">
        This permanently deletes your Dropline account and cloud projects. Local files on your computer are not removed.
      </p>
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault();
          setLoading(true);
          setError('');
          void apiDeleteAccount({ password: password || undefined, emailConfirmation: confirmEmail })
            .then(onDeleted)
            .catch(err => setError(err instanceof Error ? err.message : 'Failed'))
            .finally(() => setLoading(false));
        }}
      >
        <input
          type="email"
          required
          placeholder={`Type ${email} to confirm`}
          value={confirmEmail}
          onChange={e => setConfirmEmail(e.target.value)}
          className="field-input w-full"
        />
        <input
          type="password"
          placeholder="Password (required for email accounts)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="field-input w-full"
        />
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50">
          {loading ? 'Deleting…' : 'Delete my account'}
        </button>
      </form>
    </ModalShell>
  );
}
