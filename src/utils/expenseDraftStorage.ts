import { STORAGE_KEYS } from '../config/constants';
import type { CreateExpensePayload } from '../services/expenses.service';

export type ExpenseDraftStatus = 'pending' | 'syncing' | 'failed';

export interface ExpenseDraft {
  /** Local draft id (same value sent as clientRequestId for dedupe) */
  id: string;
  payload: CreateExpensePayload;
  status: ExpenseDraftStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  attempts: number;
}

function readAll(): ExpenseDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSE_DRAFTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExpenseDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(drafts: ExpenseDraft[]) {
  localStorage.setItem(STORAGE_KEYS.EXPENSE_DRAFTS, JSON.stringify(drafts));
  window.dispatchEvent(new CustomEvent('fleet:expense-drafts-changed'));
}

export function generateExpenseDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `draft_${crypto.randomUUID()}`;
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function listExpenseDrafts(): ExpenseDraft[] {
  return readAll().sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function countPendingExpenseDrafts(): number {
  return readAll().filter((d) => d.status === 'pending' || d.status === 'failed')
    .length;
}

export function saveExpenseDraft(
  payload: CreateExpensePayload,
  opts?: { id?: string; error?: string },
): ExpenseDraft {
  const now = new Date().toISOString();
  const id = opts?.id ?? payload.clientRequestId ?? generateExpenseDraftId();
  const drafts = readAll().filter((d) => d.id !== id);
  const draft: ExpenseDraft = {
    id,
    payload: { ...payload, clientRequestId: id },
    status: opts?.error ? 'failed' : 'pending',
    createdAt: now,
    updatedAt: now,
    lastError: opts?.error,
    attempts: 0,
  };
  drafts.push(draft);
  writeAll(drafts);
  return draft;
}

export function updateExpenseDraft(
  id: string,
  patch: Partial<Pick<ExpenseDraft, 'status' | 'lastError' | 'attempts' | 'payload'>>,
): ExpenseDraft | null {
  const drafts = readAll();
  const idx = drafts.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const next: ExpenseDraft = {
    ...drafts[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  drafts[idx] = next;
  writeAll(drafts);
  return next;
}

export function removeExpenseDraft(id: string) {
  writeAll(readAll().filter((d) => d.id !== id));
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!err || typeof err !== 'object') return false;
  if ('code' in err && (err as { code?: string }).code === 'ERR_NETWORK') {
    return true;
  }
  if ('message' in err) {
    const msg = String((err as { message?: unknown }).message ?? '').toLowerCase();
    if (
      msg.includes('network error') ||
      msg.includes('failed to fetch') ||
      msg.includes('offline')
    ) {
      return true;
    }
  }
  if ('response' in err && (err as { response?: unknown }).response == null) {
    return true;
  }
  return false;
}
