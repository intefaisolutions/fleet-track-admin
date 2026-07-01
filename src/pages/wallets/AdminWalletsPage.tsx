import { useEffect, useState } from 'react';
import { Wallet, Building2 } from 'lucide-react';
import { walletsService } from '../../services/wallets.service';
import { companiesService } from '../../services/companies.service';

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

export function AdminWalletsPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      companiesService.list(),
      walletsService.getAdminTransactions(),
    ])
      .then(([companiesResult, txsResult]) => {
        if (companiesResult.status === 'fulfilled') {
          // filter out only those who actually have some wallet logic or just all companies
          setCompanies((companiesResult.value.data as any[]) ?? []);
        }
        if (txsResult.status === 'fulfilled') {
          setTransactions((txsResult.value.data as Array<any>) ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter companies that actually have a wallet balance > 0 to focus on those with credits
  const companiesWithBalance = companies.filter(c => c.walletBalance && c.walletBalance > 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wallet Overview</h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor company wallet balances and upgrade/downgrade transactions platform-wide.
          </p>
        </div>
        <div className="flex items-center justify-center rounded-full bg-fleet-50 p-4">
          <Wallet className="h-8 w-8 text-fleet-600" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-fleet-600" />
              Company Balances
            </h2>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            {loading ? (
              <p className="p-5 text-sm text-slate-500">Loading balances...</p>
            ) : companiesWithBalance.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No companies have any wallet balance currently.</p>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide">Company</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companiesWithBalance.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                      </td>
                      <td className="px-5 py-3 font-bold text-fleet-600">
                        {formatInr(c.walletBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col h-96">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Transactions</h2>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            {loading ? (
              <p className="p-5 text-sm text-slate-500">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No wallet transactions recorded yet.</p>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide">Company & Date</th>
                    <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {tx.companyId?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(tx.createdAt)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                              tx.type === 'CREDIT'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {tx.type} {formatInr(tx.amount)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500 max-w-xs truncate" title={tx.description}>
                          {tx.description || '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
