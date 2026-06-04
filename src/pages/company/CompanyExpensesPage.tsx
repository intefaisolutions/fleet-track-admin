import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Paperclip,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import {
  expensesService,
  type ExpenseRecord,
} from '../../services/expenses.service';
import { reportsService } from '../../services/reports.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import {
  EXPENSE_CATEGORY_ORDER,
  buildCategoryStats,
  expenseCategoryLabel,
  expenseCategoryStyle,
  formatCategoryDetailsSummary,
  normalizeExpenseCategory,
} from '../../config/expenseCategories';
import { getApiErrorMessage } from '../../utils/validation';

const PAGE_SIZE = 10;

function formatInr(n: number) {
  return `₹ ${n.toLocaleString('en-IN')}`;
}

function expenseEffectiveDate(e: ExpenseRecord): Date {
  const raw = e.expenseDate ?? e.createdAt;
  const d = new Date(raw ?? '');
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function isThisMonth(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function vehicleLabel(
  v?: ExpenseRecord['vehicleId'],
): { title: string; reg: string } {
  if (!v || typeof v === 'string') return { title: 'Vehicle', reg: '—' };
  const title = [v.make, v.modelName].filter(Boolean).join(' ') || 'Vehicle';
  return { title, reg: v.registrationNumber ?? '—' };
}

function recorderName(r?: ExpenseRecord['recordedBy']): string {
  if (!r || typeof r === 'string') return 'Admin';
  if (r.fullName) {
    const parts = r.fullName.split(' ');
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`;
    return r.fullName;
  }
  return r.role === 'COMPANY_ADMIN' ? 'Admin' : 'User';
}

function exportCsv(rows: ExpenseRecord[]) {
  const header = ['Date', 'Vehicle', 'Category', 'Description', 'Amount', 'Recorded By'];
  const lines = rows.map((r) => {
    const v = vehicleLabel(r.vehicleId);
    return [
      formatDateTime(r.expenseDate ?? r.createdAt),
      v.reg,
      expenseCategoryLabel(r.category),
      r.description ?? '',
      r.amount,
      recorderName(r.recordedBy),
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(',');
  });
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'company_expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function CompanyExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({
    totalExpenses: 0,
    expensesCountThisMonth: 0,
    expensesThisMonth: 0,
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      expensesService.list(),
      vehiclesService.list(),
      reportsService.getCompanyDashboard(),
    ])
      .then(([expRes, vehRes, dashRes]) => {
        setExpenses(expRes.data ?? []);
        setVehicles(vehRes.data ?? []);
        const dash = dashRes.data;
        setSummary({
          totalExpenses: dash?.totalExpenses ?? expRes.data?.length ?? 0,
          expensesCountThisMonth:
            dash?.expensesCountThisMonth ??
            (expRes.data ?? []).filter((e) => isThisMonth(expenseEffectiveDate(e))).length,
          expensesThisMonth: dash?.expensesThisMonth ?? 0,
        });
      })
      .catch((err: unknown) => {
        setExpenses([]);
        setVehicles([]);
        setSummary({ totalExpenses: 0, expensesCountThisMonth: 0, expensesThisMonth: 0 });
        toast.error(getApiErrorMessage(err, 'Failed to load expenses'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (vehicleFilter) {
        const vid =
          typeof e.vehicleId === 'object' ? e.vehicleId?._id : e.vehicleId;
        if (vid !== vehicleFilter) return false;
      }
      if (categoryFilter && normalizeExpenseCategory(e.category) !== categoryFilter) return false;
      const d = expenseEffectiveDate(e);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [expenses, vehicleFilter, categoryFilter, dateFrom, dateTo]);

  const filteredTotalAmount = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount), 0),
    [filtered],
  );

  const categoryStats = useMemo(() => buildCategoryStats(filtered), [filtered]);

  const thisMonthFromList = useMemo(() => {
    const monthRows = expenses.filter((e) => isThisMonth(expenseEffectiveDate(e)));
    return {
      count: monthRows.length,
      amount: monthRows.reduce((s, e) => s + Number(e.amount), 0),
    };
  }, [expenses]);

  const expensesThisMonthCount = summary.expensesCountThisMonth || thisMonthFromList.count;
  const expensesThisMonthAmount = summary.expensesThisMonth || thisMonthFromList.amount;
  const totalCompanyExpenses = summary.totalExpenses || expenses.length;

  const hasActiveFilters = !!(vehicleFilter || categoryFilter || dateFrom || dateTo);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [vehicleFilter, categoryFilter, dateFrom, dateTo]);

  const applyThisMonthFilter = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(now.toISOString().slice(0, 10));
  };

  const clearFilters = () => {
    setVehicleFilter('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">
            <Link to={ROUTES.COMPANY_DASHBOARD} className="hover:text-fleet-600">
              FleetTrack
            </Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600">Expenses</span>
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">View All Expenses</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            See all expense records across the entire company. Vehicle owners and drivers
            add entries from their panels; you can review, filter, and export everything here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600"
          >
            <Download className="h-4 w-4" />
            Export Report (CSV)
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            All company records
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalCompanyExpenses}</p>
          <p className="mt-0.5 text-xs text-slate-500">total expenses logged</p>
        </div>
        <div
          className="rounded-xl px-5 py-4 text-white shadow-sm sm:col-span-2"
          style={{ background: 'linear-gradient(135deg, #00AEEF, #0078b3)' }}
        >
          <p className="text-xs font-medium text-white/80">This month</p>
          <div className="mt-1 flex flex-wrap items-end gap-3">
            <p className="text-3xl font-bold">
              {loading ? '—' : expensesThisMonthCount}{' '}
              <span className="text-lg font-semibold">
                expense{expensesThisMonthCount === 1 ? '' : 's'}
              </span>
            </p>
            <span className="mb-1 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              {loading ? '—' : formatInr(expensesThisMonthAmount)}
            </span>
          </div>
          <p className="mt-2 text-xs text-white/90">
            {hasActiveFilters
              ? `Filtered table: ${filtered.length} records · ${formatInr(filteredTotalAmount)}`
              : `${expenses.length} records loaded · use filters to narrow the table`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
        {categoryStats.map((stat) => (
          <button
            key={stat.code}
            type="button"
            onClick={() =>
              setCategoryFilter((prev) => (prev === stat.code ? '' : stat.code))
            }
            className={`rounded-xl border px-3 py-3 text-left transition ${
              categoryFilter === stat.code
                ? 'border-fleet-400 bg-fleet-50 ring-2 ring-fleet-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{stat.count}</p>
            <p className="text-xs text-slate-500">{formatInr(stat.amount)}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>
                {v.registrationNumber}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {expenseCategoryLabel(c)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2.5 text-sm"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-2.5 text-sm"
              title="To date"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyThisMonthFilter}
            className="rounded-lg border border-fleet-200 bg-fleet-50 px-3 py-2 text-sm font-medium text-fleet-700 hover:bg-fleet-100"
          >
            This month
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Vehicle</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Recorded By</th>
                <th className="px-5 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    {hasActiveFilters
                      ? 'No expenses match your filters. Try clearing filters or another date range.'
                      : 'No expenses yet. Vehicle owners and drivers record expenses from their panels.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((e) => {
                  const v = vehicleLabel(e.vehicleId);
                  return (
                    <tr
                      key={e._id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4 text-slate-600">
                        {formatDateTime(e.expenseDate ?? e.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">{v.title}</p>
                        <p className="text-xs text-slate-500">{v.reg}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${expenseCategoryStyle(e.category)}`}
                        >
                          {expenseCategoryLabel(e.category)}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-5 py-4 text-slate-600">
                        {e.description && (
                          <p className="truncate font-medium">{e.description}</p>
                        )}
                        {formatCategoryDetailsSummary(e.category, e.categoryDetails) ? (
                          <p className="truncate text-xs text-slate-500">
                            {formatCategoryDetailsSummary(e.category, e.categoryDetails)}
                          </p>
                        ) : (
                          !e.description && '—'
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatInr(Number(e.amount))}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{recorderName(e.recordedBy)}</td>
                      <td className="px-5 py-4">
                        {e.receiptUrl ? (
                          <a
                            href={e.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-fleet-600"
                          >
                            <Paperclip className="h-4 w-4" />
                          </a>
                        ) : (
                          <Paperclip className="h-4 w-4 text-slate-300" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {filtered.length === 0
              ? '0 entries'
              : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}
            {!loading && totalCompanyExpenses > 0 && (
              <span className="text-slate-400">
                {' '}
                · {totalCompanyExpenses} total across company
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-2 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-8 rounded-lg px-2 py-1 text-sm ${
                  p === page ? 'bg-fleet-500 text-white' : 'hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-2 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
