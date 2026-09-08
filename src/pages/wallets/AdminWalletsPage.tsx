import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  Building2,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  CreditCard,
  History,
} from 'lucide-react';
import {
  walletsService,
  type AdminWalletStats,
  type AdminCompanyBalanceRow,
  type AdminWalletTransactionRow,
} from '../../services/wallets.service';
import { formatInr } from '../../utils/currency';

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

function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  // Generate pagination page numbers
  const pages: number[] = [];
  const maxButtons = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start < maxButtons - 1) {
    start = Math.max(1, end - maxButtons + 1);
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-800 font-semibold">{from}</strong>–
          <strong className="text-slate-800 font-semibold">{to}</strong> of{' '}
          <strong className="text-slate-800 font-semibold">{total}</strong> results
        </span>
        <span className="text-slate-300">|</span>
        <label className="flex items-center gap-1.5">
          <span>Per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          title="Previous Page"
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-8 h-8 rounded-lg text-xs font-semibold transition ${
              p === page
                ? 'bg-fleet-600 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          title="Next Page"
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AdminWalletsPage() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'companies'>('transactions');

  // Stats
  const [stats, setStats] = useState<AdminWalletStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Transactions State
  const [txItems, setTxItems] = useState<AdminWalletTransactionRow[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);
  const [txSearch, setTxSearch] = useState('');
  const [txSearchInput, setTxSearchInput] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
  const [txCompanyIdFilter, setTxCompanyIdFilter] = useState<string>('');
  const [txLoading, setTxLoading] = useState(false);

  // Company Balances State
  const [companyItems, setCompanyItems] = useState<AdminCompanyBalanceRow[]>([]);
  const [companyTotal, setCompanyTotal] = useState(0);
  const [companyPage, setCompanyPage] = useState(1);
  const [companyLimit, setCompanyLimit] = useState(10);
  const [companySearch, setCompanySearch] = useState('');
  const [companySearchInput, setCompanySearchInput] = useState('');
  const [companyBalanceFilter, setCompanyBalanceFilter] = useState<'ALL' | 'WITH_BALANCE'>('ALL');
  const [companyLoading, setCompanyLoading] = useState(false);

  // Load Stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await walletsService.getAdminStats();
      if (res.data) setStats(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await walletsService.getAdminTransactions({
        page: txPage,
        limit: txLimit,
        search: txSearch || undefined,
        type: txTypeFilter === 'ALL' ? undefined : txTypeFilter,
        companyId: txCompanyIdFilter || undefined,
      });
      if (res.data) {
        setTxItems(res.data.items || []);
        setTxTotal(res.data.total || 0);
      }
    } catch {
      setTxItems([]);
      setTxTotal(0);
    } finally {
      setTxLoading(false);
    }
  }, [txPage, txLimit, txSearch, txTypeFilter, txCompanyIdFilter]);

  // Load Company Balances
  const loadCompanyBalances = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const res = await walletsService.getAdminBalances({
        page: companyPage,
        limit: companyLimit,
        search: companySearch || undefined,
        hasBalance: companyBalanceFilter === 'WITH_BALANCE',
      });
      if (res.data) {
        setCompanyItems(res.data.items || []);
        setCompanyTotal(res.data.total || 0);
      }
    } catch {
      setCompanyItems([]);
      setCompanyTotal(0);
    } finally {
      setCompanyLoading(false);
    }
  }, [companyPage, companyLimit, companySearch, companyBalanceFilter]);

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadCompanyBalances();
  }, [loadCompanyBalances]);

  // Debounced search for transactions
  const handleTxSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTxPage(1);
    setTxSearch(txSearchInput.trim());
  };

  const handleClearTxSearch = () => {
    setTxSearchInput('');
    setTxSearch('');
    setTxPage(1);
  };

  // Debounced search for companies
  const handleCompanySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyPage(1);
    setCompanySearch(companySearchInput.trim());
  };

  const handleClearCompanySearch = () => {
    setCompanySearchInput('');
    setCompanySearch('');
    setCompanyPage(1);
  };

  // Quick action to view company transactions
  const viewCompanyTransactions = (companyId: string, companyName: string) => {
    setTxCompanyIdFilter(companyId);
    setTxSearchInput(companyName);
    setTxSearch(companyName);
    setTxPage(1);
    setActiveTab('transactions');
  };

  const clearCompanyFilter = () => {
    setTxCompanyIdFilter('');
    setTxSearchInput('');
    setTxSearch('');
    setTxPage(1);
  };

  const txTotalPages = Math.ceil(txTotal / txLimit) || 1;
  const companyTotalPages = Math.ceil(companyTotal / companyLimit) || 1;

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-fleet-950 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-fleet-500/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-fleet-300">
                Financial Operations
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Wallet Overview
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-300">
              Platform-wide company wallet credit balances, plan-change pro-rated adjustments, and wallet transactions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              loadStats();
              loadTransactions();
              loadCompanyBalances();
            }}
            disabled={txLoading || companyLoading || loadingStats}
            className="inline-flex items-center gap-2 self-start md:self-auto rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${txLoading || companyLoading || loadingStats ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </section>

      {/* Overview Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Wallet Balance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Wallet Balance
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fleet-50 text-fleet-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatInr(stats?.totalBalance ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Active credits across companies
          </p>
        </div>

        {/* Companies with Balance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Companies with Credits
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {stats?.companiesWithBalance ?? 0}
            <span className="ml-1.5 text-sm font-normal text-slate-400">
              / {stats?.totalCompanies ?? 0}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Client companies holding positive balance
          </p>
        </div>

        {/* Total Credits Issued */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Credits Issued
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600">
            +{formatInr(stats?.totalCredits ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Prorated credits from plan changes
          </p>
        </div>

        {/* Total Debits Applied */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Debits Used
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-600">
            -{formatInr(stats?.totalDebits ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Applied toward upgrade subscriptions
          </p>
        </div>
      </section>

      {/* Main Full-Width Content Container */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-6 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`inline-flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition ${
                activeTab === 'transactions'
                  ? 'border-fleet-600 text-fleet-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="h-4 w-4" />
              Wallet Transactions
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === 'transactions'
                    ? 'bg-fleet-100 text-fleet-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {txTotal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`inline-flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition ${
                activeTab === 'companies'
                  ? 'border-fleet-600 text-fleet-700 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Company Balances
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === 'companies'
                    ? 'bg-fleet-100 text-fleet-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {companyTotal}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: TRANSACTIONS VIEW */}
        {activeTab === 'transactions' && (
          <div>
            {/* Filter & Search Toolbar */}
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-white">
              <form onSubmit={handleTxSearchSubmit} className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={txSearchInput}
                  onChange={(e) => setTxSearchInput(e.target.value)}
                  placeholder="Search by company, email, plan, or note..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-9 py-2 text-sm outline-none transition focus:border-fleet-500 focus:bg-white focus:ring-2 focus:ring-fleet-500/20"
                />
                {txSearchInput && (
                  <button
                    type="button"
                    onClick={handleClearTxSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>

              <div className="flex flex-wrap items-center gap-3">
                {/* Type Filter */}
                <select
                  value={txTypeFilter}
                  onChange={(e) => {
                    setTxTypeFilter(e.target.value as 'ALL' | 'CREDIT' | 'DEBIT');
                    setTxPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-fleet-500 focus:bg-white"
                >
                  <option value="ALL">All Types</option>
                  <option value="CREDIT">Credits (+)</option>
                  <option value="DEBIT">Debits (-)</option>
                </select>

                {/* Clear Company Filter Pill if active */}
                {txCompanyIdFilter && (
                  <button
                    type="button"
                    onClick={clearCompanyFilter}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    <span>Filtered by Company</span>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Company</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Balance Change</th>
                    <th className="px-6 py-3.5">Transaction Details</th>
                    <th className="px-6 py-3.5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {txLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-fleet-500 mb-2" />
                        Loading wallet transactions...
                      </td>
                    </tr>
                  ) : txItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <CreditCard className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No transactions found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {txSearch || txTypeFilter !== 'ALL'
                            ? 'Try adjusting your search query or filters.'
                            : 'Transactions will appear here when companies upgrade or downgrade their plans.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    txItems.map((tx) => {
                      const company =
                        typeof tx.companyId === 'object' && tx.companyId ? tx.companyId : null;
                      const companyName = company?.name || 'Client Company';
                      const companyEmail = company?.email || '—';
                      const isCredit = tx.type === 'CREDIT';

                      return (
                        <tr key={tx._id} className="hover:bg-slate-50/70 transition">
                          {/* Company */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fleet-50 text-xs font-bold text-fleet-700">
                                {companyName[0]?.toUpperCase() ?? 'C'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">
                                  {companyName}
                                </div>
                                <div className="text-xs text-slate-400 truncate">
                                  {companyEmail}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ${
                                isCredit
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                              {tx.type}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-6 py-4 font-bold text-sm">
                            <span className={isCredit ? 'text-emerald-600' : 'text-rose-600'}>
                              {isCredit ? '+' : '-'} {formatInr(tx.amount)}
                            </span>
                          </td>

                          {/* Balance Change */}
                          <td className="px-6 py-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                            {formatInr(tx.previousBalance ?? 0)}{' '}
                            <span className="text-slate-400">➔</span>{' '}
                            <strong className="text-slate-800 font-semibold">
                              {formatInr(tx.currentBalance ?? 0)}
                            </strong>
                          </td>

                          {/* Details */}
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-800 font-medium max-w-md">
                              {tx.friendlyExplanation || tx.description || tx.reason || '—'}
                            </div>
                            {tx.changeAction && (
                              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                                {tx.changeAction}
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(tx.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!txLoading && txTotal > 0 && (
              <PaginationControls
                page={txPage}
                totalPages={txTotalPages}
                total={txTotal}
                limit={txLimit}
                onPageChange={setTxPage}
                onLimitChange={(l) => {
                  setTxLimit(l);
                  setTxPage(1);
                }}
              />
            )}
          </div>
        )}

        {/* TAB 2: COMPANY BALANCES VIEW */}
        {activeTab === 'companies' && (
          <div>
            {/* Filter & Search Toolbar */}
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 bg-white">
              <form onSubmit={handleCompanySearchSubmit} className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={companySearchInput}
                  onChange={(e) => setCompanySearchInput(e.target.value)}
                  placeholder="Search company by name, email, phone, or plan..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-9 py-2 text-sm outline-none transition focus:border-fleet-500 focus:bg-white focus:ring-2 focus:ring-fleet-500/20"
                />
                {companySearchInput && (
                  <button
                    type="button"
                    onClick={handleClearCompanySearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={companyBalanceFilter}
                  onChange={(e) => {
                    setCompanyBalanceFilter(e.target.value as 'ALL' | 'WITH_BALANCE');
                    setCompanyPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-fleet-500 focus:bg-white"
                >
                  <option value="ALL">All Registered Companies</option>
                  <option value="WITH_BALANCE">Positive Balance Only (&gt; ₹0)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Company Name</th>
                    <th className="px-6 py-3.5">Contact Details</th>
                    <th className="px-6 py-3.5">Current Plan</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Wallet Balance</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {companyLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="mx-auto h-6 w-6 animate-spin text-fleet-500 mb-2" />
                        Loading company balances...
                      </td>
                    </tr>
                  ) : companyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <Building2 className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">No companies found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {companySearch || companyBalanceFilter !== 'ALL'
                            ? 'Try adjusting your search term or balance filter.'
                            : 'No companies registered yet.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    companyItems.map((c) => {
                      const hasBalance = (c.walletBalance ?? 0) > 0;

                      return (
                        <tr key={c._id} className="hover:bg-slate-50/70 transition">
                          {/* Company Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fleet-50 text-sm font-bold text-fleet-700">
                                {c.name[0]?.toUpperCase() ?? 'C'}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">{c.name}</div>
                                <div className="text-xs text-slate-400">
                                  Joined {formatDate(c.createdAt)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Details */}
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-700">{c.email}</div>
                            {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                          </td>

                          {/* Current Plan */}
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              {c.planType || 'FREE'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                c.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Wallet Balance */}
                          <td className="px-6 py-4 font-bold text-base">
                            <span
                              className={
                                hasBalance
                                  ? 'text-fleet-600 bg-fleet-50 px-2.5 py-1 rounded-lg border border-fleet-100'
                                  : 'text-slate-400'
                              }
                            >
                              {formatInr(c.walletBalance ?? 0)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => viewCompanyTransactions(c._id, c.name)}
                              className="inline-flex items-center gap-1 rounded-lg border border-fleet-200 bg-fleet-50/50 px-3 py-1.5 text-xs font-semibold text-fleet-700 hover:bg-fleet-100 transition"
                            >
                              <History className="h-3.5 w-3.5" />
                              View Transactions
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!companyLoading && companyTotal > 0 && (
              <PaginationControls
                page={companyPage}
                totalPages={companyTotalPages}
                total={companyTotal}
                limit={companyLimit}
                onPageChange={setCompanyPage}
                onLimitChange={(l) => {
                  setCompanyLimit(l);
                  setCompanyPage(1);
                }}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
