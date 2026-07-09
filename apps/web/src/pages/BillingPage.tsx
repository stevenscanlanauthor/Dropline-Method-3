import { Link } from '../components/SiteNav';
import { isMacAppStoreShell } from '../lib/electron-app';
import { apiBillingStatus, apiIapVerify, apiRedeemAccessCode } from '../lib/auth';
import { useEffect, useState } from 'react';

export default function BillingPage() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof apiBillingStatus>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [iapPrice, setIapPrice] = useState<string | null>(null);
  const [friendCode, setFriendCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMsg, setCodeMsg] = useState('');
  const isMas = isMacAppStoreShell();

  useEffect(() => {
    apiBillingStatus()
      .then(setStatus)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load billing'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isMas || !window.electronApp?.iap) return;
    window.electronApp.iap.getLifetimeProduct().then(p => {
      if (p.ok && p.displayPrice) setIapPrice(p.displayPrice);
    }).catch(() => {});
  }, [isMas]);

  async function verifySignedTransaction(signedTransaction: string) {
    await apiIapVerify(signedTransaction);
    const s = await apiBillingStatus();
    setStatus(s);
  }

  async function handleMacPurchase() {
    if (!window.electronApp?.iap) {
      setError('In-App Purchase is only available in the Mac App Store app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await window.electronApp.iap.purchaseLifetime();
      if (!result.ok || !result.transaction?.signedTransaction) {
        throw new Error(result.error || 'Purchase failed');
      }
      await verifySignedTransaction(result.transaction.signedTransaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!window.electronApp?.iap) {
      setError('Restore is only available in the Mac App Store app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await window.electronApp.iap.restorePurchases();
      if (!result.ok) throw new Error(result.error || 'Restore failed');
      const txs = result.transactions ?? (result.transaction ? [result.transaction] : []);
      if (txs.length === 0) {
        setError('No previous App Store purchases found for this Apple ID.');
        return;
      }
      const latest = txs[txs.length - 1]!;
      await verifySignedTransaction(latest.signedTransaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  }

  const ent = status?.entitlement;

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-[var(--accent)]">← Back to Dropline</Link>
      </header>
      <main className="max-w-lg mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        {loading && <p className="text-[var(--muted)]">Loading…</p>}
        {!loading && ent && (
          <div className="rounded-xl border border-[var(--border)] p-5 space-y-3">
            {ent.status === 'trial' && (
              <p>
                <strong>{ent.trialDaysRemaining ?? 0} days</strong> left in your free trial.
              </p>
            )}
            {ent.status === 'paid' && <p className="text-green-700 font-medium">Lifetime access active on all devices.</p>}
            {ent.status === 'expired' && (
              <p className="text-amber-800">Your trial has ended. Upgrade to keep writing and compiling.</p>
            )}
          </div>
        )}
        {ent?.status !== 'paid' && (
          <div className="space-y-4">
            {isMas ? (
              <>
                <p className="text-sm text-[var(--muted)]">
                  One-time lifetime purchase (not a subscription). New accounts get a 14-day free trial.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleMacPurchase()}
                  className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold disabled:opacity-60"
                >
                  {busy ? 'Processing…' : `Upgrade — ${iapPrice ?? '$39'} lifetime`}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleRestore()}
                  className="w-full py-2 rounded-xl border border-[var(--border)]"
                >
                  Restore Purchases
                </button>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Upgrade on the <strong>Mac App Store</strong> ($39 lifetime) or <strong>iOS App Store</strong> ($29 lifetime).
                Sign in with the same account on any device — your purchase unlocks everywhere. Not a subscription.
              </p>
            )}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
              <p className="text-sm font-medium">Have a friend code?</p>
              <div className="flex gap-2">
                <input
                  value={friendCode}
                  onChange={e => setFriendCode(e.target.value.toUpperCase())}
                  placeholder="FRIENDCODE"
                  className="field-input flex-1"
                />
                <button
                  type="button"
                  disabled={codeBusy || !friendCode.trim()}
                  className="panel-header-action px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => {
                    setCodeBusy(true);
                    setCodeMsg('');
                    setError('');
                    void apiRedeemAccessCode(friendCode.trim())
                      .then(async () => {
                        setCodeMsg('Code redeemed — lifetime access unlocked.');
                        setStatus(await apiBillingStatus());
                        setFriendCode('');
                      })
                      .catch(err => setError(err instanceof Error ? err.message : 'Could not redeem code'))
                      .finally(() => setCodeBusy(false));
                  }}
                >
                  {codeBusy ? '…' : 'Redeem'}
                </button>
              </div>
              {codeMsg && <p className="text-sm text-emerald-700">{codeMsg}</p>}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-[var(--muted)]">
          Questions? <a href="/support" className="underline">Support</a> · <a href="/privacy" className="underline">Privacy</a>
        </p>
      </main>
    </div>
  );
}
