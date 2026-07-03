export type EntitlementStatus = {
  platform: 'web' | 'ios' | 'macos';
  status: 'trial' | 'paid' | 'expired' | 'none' | 'revoked';
  trialDaysRemaining: number | null;
  trialExpiresAt: string | null;
  paidAt: string | null;
};

export type BillingStatus = {
  entitlement: EntitlementStatus;
  canWrite: boolean;
};

export function isMacAppStoreShell(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.userAgent.includes('Dropline/MacAppStore');
}

declare global {
  interface Window {
    electronApp?: {
      platform?: string;
      distribution?: string;
      iap?: {
        getLifetimeProduct: () => Promise<{
          ok: boolean;
          displayPrice?: string;
          error?: string;
        }>;
        purchaseLifetime: () => Promise<{
          ok: boolean;
          transaction?: { transactionId: string; signedTransaction: string };
          error?: string;
        }>;
        restorePurchases: () => Promise<{
          ok: boolean;
          transaction?: { transactionId: string; signedTransaction: string };
          transactions?: { transactionId: string; signedTransaction: string }[];
          error?: string;
        }>;
      };
    };
  }
}
