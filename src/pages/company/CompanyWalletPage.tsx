import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  CheckCircle2,
  Info,
  Wallet,
} from 'lucide-react';
import { formatInr } from '../../utils/currency';
import { ROUTES } from '../../config/constants';
import {
  walletsService,
  type WalletBalancePayload,
  type WalletTransactionRow,
} from '../../services/wallets.service';

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CompanyWalletPage() {
  const [summary, setSummary] = useState<WalletBalancePayload | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      walletsService.getBalance(),
      walletsService.getTransactions(),
    ])
      .then(([balanceResult, txsResult]) => {
        if (balanceResult.status === 'fulfilled') {
          setSummary(balanceResult.value.data ?? null);
        }
        if (txsResult.status === 'fulfilled') {
          setTransactions(txsResult.value.data ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const balance = summary?.walletBalance ?? 0;
  const currentPlan = summary?.currentPlan;
  const lastChange = summary?.lastChange;
  const isUpgrade = lastChange?.action === 'UPGRADED';
  const isDowngrade = lastChange?.action === 'DOWNGRADED';

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wallet & Credits</h1>
          <p className="mt-2 text-sm text-slate-500">
            See your current plan, upgrade/downgrade history, and how many days were used
            before credits were calculated.
          </p>
        </div>
        <div className="flex items-center justify-center rounded-full bg-fleet-50 p-4">
          <Wallet className="h-8 w-8 text-fleet-600" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available Balance
          </p>
          <p className="mt-3 text-4xl font-bold text-fleet-600">
            {loading ? '…' : formatInr(balance)}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Applied automatically on your next upgrade or renewal
          </p>
        </div>

        <div className="rounded-xl border border-fleet-200 bg-gradient-to-br from-fleet-50 to-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-fleet-700">
            Your current plan
          </p>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {currentPlan?.displayName || currentPlan?.planType || '—'}
              </p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                {currentPlan?.planType || '—'}
              </p>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt>Vehicle limit</dt>
                  <dd className="font-semibold text-slate-900">
                    {currentPlan?.vehicleLimit ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Valid until</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatDate(currentPlan?.currentPeriodEnd)}
                  </dd>
                </div>
              </dl>
              <Link
                to={ROUTES.COMPANY_SUBSCRIPTION}
                className="mt-4 inline-flex text-sm font-semibold text-fleet-700 hover:underline"
              >
                Manage plans
              </Link>
            </>
          )}
        </div>

        <div
          className={`rounded-xl border p-6 shadow-sm ${
            isDowngrade
              ? 'border-amber-200 bg-amber-50/60'
              : isUpgrade
                ? 'border-sky-200 bg-sky-50/60'
                : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last plan change
          </p>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : lastChange ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    isDowngrade
                      ? 'bg-amber-100 text-amber-900'
                      : isUpgrade
                        ? 'bg-sky-100 text-sky-900'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isDowngrade ? (
                    <ArrowDownCircle className="h-3 w-3" />
                  ) : isUpgrade ? (
                    <ArrowUpCircle className="h-3 w-3" />
                  ) : null}
                  {lastChange.actionLabel || lastChange.action}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDate(lastChange.changedAt)}
                </span>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                <span>{lastChange.fromPlanName || lastChange.fromPlan}</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <span>{lastChange.toPlanName || lastChange.toPlan}</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {formatInr(lastChange.oldPrice ?? 0)} → {formatInr(lastChange.newPrice ?? 0)}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No upgrade or downgrade recorded yet. Credits appear after a plan change.
            </p>
          )}
        </div>
      </section>

      {lastChange ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-fleet-600" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900">
                How your last credit was calculated
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {lastChange.summary}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Days used</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {lastChange.usedDays ?? 0} day
                    {(lastChange.usedDays ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Value used</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatInr(lastChange.usedAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
                  <p className="text-xs text-emerald-700">Unused credit to wallet</p>
                  <p className="mt-1 text-lg font-bold text-emerald-800">
                    +{formatInr(lastChange.creditGenerated ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-xs text-slate-400">Wallet used for new plan</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    −{formatInr(lastChange.walletUsed ?? 0)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Example: if you used a plan for 3–4 days, that portion is deducted from the
                old plan price; the rest becomes wallet credit for your{' '}
                {(lastChange.actionLabel || 'plan change').toLowerCase()}.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Info className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-blue-900">How wallet credits work</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-blue-800">
                When you change plans before the period ends, unused days become credits.
                Used days are charged against the old plan price.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-blue-800">
                <li className="flex items-start gap-2.5">
                  <ArrowDownCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>
                    Downgrade: unused days from the higher plan convert to wallet credit.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>
                    Upgrade: unused credit applies first; you only pay the difference if
                    needed.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>
                    Credits deduct automatically on the next upgrade or renewal.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Wallet Transactions</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No past wallet transactions found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">What happened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
                          tx.type === 'CREDIT'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.type}
                      </span>
                      {tx.changeAction ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">
                          {tx.changeAction === 'DOWNGRADED'
                            ? 'Downgrade'
                            : tx.changeAction === 'UPGRADED'
                              ? 'Upgrade'
                              : tx.changeAction}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {tx.type === 'CREDIT' ? '+' : '−'}
                      {formatInr(tx.amount)}
                    </td>
                    <td className="max-w-md px-4 py-3 text-xs leading-relaxed text-slate-600">
                      {tx.friendlyExplanation || tx.description || tx.reason || '—'}
                      {tx.usedDays != null && tx.type === 'CREDIT' ? (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Used {tx.usedDays} day{tx.usedDays === 1 ? '' : 's'}
                          {tx.usedAmount != null
                            ? ` · used value ${formatInr(tx.usedAmount)}`
                            : ''}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
