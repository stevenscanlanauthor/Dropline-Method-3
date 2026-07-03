import { useEffect, useState } from 'react';
import { apiBillingStatus, type BillingStatus } from './auth';

export function useBillingStatus(enabled: boolean) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    apiBillingStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [enabled]);

  return { status, loading, canWrite: status?.canWrite !== false };
}
