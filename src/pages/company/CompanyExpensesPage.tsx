import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Paperclip,
} from 'lucide-react';
import {
  expensesService,
  type ExpenseRecord,
} from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

const PAGE_SIZE = 10;

const CATEGORIES = [
  'FUEL',
  'SERVICE',
  'TOLL',
  'INSURANCE',
  'PUC',
  'CHALLAN',
  'OTHER',
] as const;

const CATEGORY_STYLES: Record<string, string> = {
  FUEL: 'bg-sky-100 text-sky-800',
  SERVICE: 'bg-orange-100 text-orange-800',
  TOLL: 'bg-purple-100 text-purple-800',
  INSURANCE: 'bg-emerald-100 text-emerald-800',
  PUC: 'bg-teal-100 text-teal-800',
  CHALLAN: 'bg-red-100 text-red-800',
  OTHER: 'bg-slate-100 text-slate-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: 'Fuel',
  SERVICE: 'Repair',
  TOLL: 'Toll',
  INSURANCE: 'Insurance',
  PUC: 'PUC',
  CHALLAN: 'Challan',
  OTHER: 'Other',
};

function categoryLabel(c: string) {
  return CATEGORY_LABELS[c] ?? c;
}

function formatInr(n: number) {
  return `₹ ${n.toLocaleString('en-IN')}`;
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
      categoryLabel(r.category),
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

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([expensesService.list(), vehiclesService.list()])
      .then(([expRes, vehRes]) => {
        setExpenses(expRes.data ?? []);
        setVehicles(vehRes.data ?? []);
      })
      .catch((err: unknown) => {
        setExpenses([]);
        setVehicles([]);
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
      if (categoryFilter && e.category !== categoryFilter) return false;
      const d = new Date(e.expenseDate ?? e.createdAt ?? '');
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [expenses, vehicleFilter, categoryFilter, dateFrom, dateTo]);

  const filteredTotalAmount = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount), 0),
    [filtered],
  );

  const companyThisMonthTotal = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return expenses
      .filter((e) => {
        const d = new Date(e.expenseDate ?? e.createdAt ?? '');
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [vehicleFilter, categoryFilter, dateFrom, dateTo]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expensesService.remove(id);
      toast.success('Expense deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">
            View-only page. Company Admin can review all expense records across the company.
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
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

        <div
          className="rounded-xl px-6 py-4 text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, #00AEEF, #0078b3)' }}
        >
          <p className="text-xs font-medium text-white/80">Company Total (This Month)</p>
          <div className="mt-1 flex items-end gap-3">
            <p className="text-2xl font-bold">{formatInr(companyThisMonthTotal)}</p>
            {filtered.length > 0 && (
              <span className="mb-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-100">
                {filtered.length} entries
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-white/80">
            Filtered view total: {formatInr(filteredTotalAmount)}
          </p>
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
                    No expenses yet. Vehicle owners and drivers record expenses from their
                    panels.
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
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.OTHER
                          }`}
                        >
                          {categoryLabel(e.category)}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-5 py-4 text-slate-600">
                        {e.description ?? '—'}
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
