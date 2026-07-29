import { toast } from 'react-toastify';
import {
  expensesService,
  type CreateExpensePayload,
} from './expenses.service';
import {
  countPendingExpenseDrafts,
  isNetworkError,
  listExpenseDrafts,
  removeExpenseDraft,
  saveExpenseDraft,
  updateExpenseDraft,
} from '../utils/expenseDraftStorage';
import { getApiErrorMessage } from '../utils/validation';

let syncInFlight = false;

/**
 * Create expense online, or queue as offline draft when the network is down.
 * Always attaches a clientRequestId for server-side duplicate prevention.
 */
export async function createExpenseWithOfflineSupport(
  payload: CreateExpensePayload,
): Promise<{ synced: boolean; draftId?: string }> {
  const withId: CreateExpensePayload = {
    ...payload,
    clientRequestId:
      payload.clientRequestId ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `draft_${crypto.randomUUID()}`
        : `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`),
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const draft = saveExpenseDraft(withId);
    return { synced: false, draftId: draft.id };
  }

  try {
    await expensesService.create(withId);
    return { synced: true };
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      const draft = saveExpenseDraft(withId, {
        error: getApiErrorMessage(err, 'Network unavailable'),
      });
      return { synced: false, draftId: draft.id };
    }
    throw err;
  }
}

/**
 * Sync pending/failed drafts. Idempotent via clientRequestId.
 */
export async function syncPendingExpenseDrafts(opts?: {
  silent?: boolean;
}): Promise<{ synced: number; failed: number }> {
  if (syncInFlight) return { synced: 0, failed: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: countPendingExpenseDrafts() };
  }

  syncInFlight = true;
  let synced = 0;
  let failed = 0;

  try {
    const pending = listExpenseDrafts().filter(
      (d) => d.status === 'pending' || d.status === 'failed',
    );

    for (const draft of pending) {
      updateExpenseDraft(draft.id, {
        status: 'syncing',
        attempts: draft.attempts + 1,
      });

      try {
        await expensesService.create({
          ...draft.payload,
          clientRequestId: draft.id,
        });
        removeExpenseDraft(draft.id);
        synced += 1;
      } catch (err: unknown) {
        if (isNetworkError(err)) {
          updateExpenseDraft(draft.id, {
            status: 'pending',
            lastError: 'Waiting for connection…',
          });
          failed += 1;
          break; // stop — still offline
        }
        updateExpenseDraft(draft.id, {
          status: 'failed',
          lastError: getApiErrorMessage(err, 'Sync failed'),
        });
        failed += 1;
      }
    }

    if (!opts?.silent && synced > 0) {
      toast.success(
        synced === 1
          ? '1 offline expense synced'
          : `${synced} offline expenses synced`,
      );
    }
  } finally {
    syncInFlight = false;
  }

  return { synced, failed };
}
