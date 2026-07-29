import { useCallback, useEffect, useState } from 'react';
import { syncPendingExpenseDrafts } from '../services/expense-offline.service';
import {
  countPendingExpenseDrafts,
  listExpenseDrafts,
  type ExpenseDraft,
} from '../utils/expenseDraftStorage';

export function useExpenseOfflineSync() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [drafts, setDrafts] = useState<ExpenseDraft[]>(() => listExpenseDrafts());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setDrafts(listExpenseDrafts());
  }, []);

  const syncNow = useCallback(async (silent = false) => {
    if (!navigator.onLine) return { synced: 0, failed: countPendingExpenseDrafts() };
    setSyncing(true);
    try {
      const result = await syncPendingExpenseDrafts({ silent });
      refresh();
      if (result.synced > 0) {
        setLastSyncAt(new Date().toISOString());
      }
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncNow(false);
    };
    const onOffline = () => setOnline(false);
    const onDraftsChanged = () => refresh();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('fleet:expense-drafts-changed', onDraftsChanged);

    // Sync any leftover drafts on mount if online
    if (navigator.onLine && countPendingExpenseDrafts() > 0) {
      void syncNow(true);
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('fleet:expense-drafts-changed', onDraftsChanged);
    };
  }, [refresh, syncNow]);

  const pendingCount = drafts.filter(
    (d) => d.status === 'pending' || d.status === 'failed' || d.status === 'syncing',
  ).length;

  return {
    online,
    drafts,
    pendingCount,
    syncing,
    lastSyncAt,
    syncNow,
    refresh,
  };
}
