import { useEffect, useState } from 'react';
import { Wallet, Info, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { walletsService } from '../../services/wallets.service';

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
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
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      walletsService.getBalance(),
      walletsService.getTransactions(),
    ])
      .then(([balanceResult, txsResult]) => {
        if (balanceResult.status === 'fulfilled') {
          setBalance((balanceResult.value.data as any)?.walletBalance ?? 0);
        }
        if (txsResult.status === 'fulfilled') {
          setTransactions((txsResult.value.data as Array<any>) ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wallet & Credits</h1>
          <p className="mt-2 text-sm text-slate-500">
            View your available prorated credits from plan downgrades.
          </p>
        </div>
        <div className="flex items-center justify-center rounded-full bg-fleet-50 p-4">
          <Wallet className="h-8 w-8 text-fleet-600" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center items-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available Balance
          </p>
          <p className="mt-3 text-4xl font-bold text-fleet-600">
            {loading ? '...' : formatInr(balance)}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Used automatically on next plan upgrade
          </p>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-blue-900">How Wallet Credits Work</h3>
              <p className="mt-1.5 text-sm text-blue-800 leading-relaxed">
                Your wallet securely holds prorated credits that you receive when you downgrade your active plan before it expires. This ensures that you never lose the money you've already paid.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-blue-800">
                <li className="flex items-center gap-2.5">
                  <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                  <span><strong>Downgrades:</strong> Unused days from your higher plan are calculated and instantly converted to credits.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span><strong>Automatic Deduction:</strong> Credits are automatically applied to reduce the cost of your next plan renewal or upgrade!</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

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
                  <th className="px-4 py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(tx.createdAt)}</td>
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
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {tx.type === 'CREDIT' ? '+' : '-'}{formatInr(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs">{tx.reason || tx.description || '—'}</td>
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
