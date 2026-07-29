import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useExpenseOfflineSync } from '../../hooks/useExpenseOfflineSync';

export function ExpenseSyncStatusBanner() {
  const { online, pendingCount, syncing, drafts, syncNow } =
    useExpenseOfflineSync();

  if (online && pendingCount === 0 && !syncing) {
    return null;
  }

  const failed = drafts.filter((d) => d.status === 'failed');

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        !online
          ? 'border-amber-200 bg-amber-50'
          : failed.length > 0
            ? 'border-rose-200 bg-rose-50'
            : 'border-sky-200 bg-sky-50'
      }`}
      role="status"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 text-slate-600">
            {!online ? (
              <WifiOff className="h-5 w-5 text-amber-600" />
            ) : syncing ? (
              <RefreshCw className="h-5 w-5 animate-spin text-sky-600" />
            ) : failed.length > 0 ? (
              <CloudOff className="h-5 w-5 text-rose-600" />
            ) : (
              <Wifi className="h-5 w-5 text-sky-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {!online
                ? 'You are offline'
                : syncing
                  ? 'Syncing offline expenses…'
                  : pendingCount > 0
                    ? `${pendingCount} expense draft${pendingCount === 1 ? '' : 's'} waiting to sync`
                    : 'All drafts synced'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {!online
                ? 'New expenses will be saved on this device and uploaded automatically when you reconnect.'
                : failed.length > 0
                  ? failed[0]?.lastError ??
                    'Some drafts failed — tap Sync to retry.'
                  : 'Pending drafts upload once when the connection returns (duplicates are blocked).'}
            </p>
          </div>
        </div>

        {(pendingCount > 0 || !online) && (
          <button
            type="button"
            disabled={!online || syncing || pendingCount === 0}
            onClick={() => void syncNow(false)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        )}
      </div>
    </div>
  );
}
