import { useExpenseOfflineSync } from '../../hooks/useExpenseOfflineSync';

/** Mount once under OwnerLayout so drafts auto-sync when connectivity returns. */
export function ExpenseOfflineSyncBootstrap() {
  useExpenseOfflineSync();
  return null;
}
