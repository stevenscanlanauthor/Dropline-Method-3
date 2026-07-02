import { useEffect, useState } from 'react';
import { apiAdmin } from './auth';

interface AdminAlert {
  isRead: boolean;
}

export function useAdminAlertCount(isAdmin: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const refresh = () => {
      void apiAdmin<AdminAlert[]>('/admin/alerts')
        .then(alerts => {
          if (!cancelled) setCount(alerts.filter(a => !a.isRead).length);
        })
        .catch(() => {});
    };

    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAdmin]);

  return count;
}
