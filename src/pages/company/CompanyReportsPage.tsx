import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, FileBarChart2 } from 'lucide-react';
import { expensesService, type ExpenseRecord } from '../../services/expenses.service';
import { getApiErrorMessage } from '../../utils/validation';

type GroupRow = { name: string; amount: number };

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function categoryLabel(category: string) {
  switch (category) {
    case 'FUEL':
      return 'Fuel';
    case 'SERVICE':
      return 'Service';
    case 'TOLL':
      return 'Toll';
    case 'INSURANCE':
      return 'Insurance';
    case 'PUC':
      return 'PUC';
    case 'CHALLAN':
      return 'Challan';
    default:
      return category;
  }
}

function expenseDate(record: ExpenseRecord) {
  const raw = record.expenseDate ?? record.createdAt;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function ownerLabel(record: ExpenseRecord): string {
  const vehicle = record.vehicleId;
  if (vehicle && typeof vehicle === 'object' && vehicle.ownerId) {
    if (typeof vehicle.ownerId === 'object' && vehicle.ownerId.fullName) {
      return vehicle.ownerId.fullName;
    }
  }
  const recorder = record.recordedBy;
  if (recorder && typeof recorder === 'object' && recorder.fullName) {
    return recorder.fullName;
  }
  return 'Unassigned';
}

function buildCsv(
  month: string,
  total: number,
  vehicles: GroupRow[],
  owners: GroupRow[],
  categories: GroupRow[],
) {
  const rows: string[] = [];
  rows.push(`"Company Report","${monthLabel(month)}"`);
  rows.push(`"Total Expense","${total}"`);
  rows.push('');

  rows.push('"Vehicle-wise Report"');
  rows.push('"Vehicle","Amount"');
  vehicles.forEach((r) => rows.push(`"${r.name}","${r.amount}"`));
  rows.push('');

  rows.push('"Owner-wise Report"');
  rows.push('"Owner","Amount"');
  owners.forEach((r) => rows.push(`"${r.name}","${r.amount}"`));
  rows.push('');

  rows.push('"Category Report"');
  rows.push('"Category","Amount"');
  categories.forEach((r) => rows.push(`"${r.name}","${r.amount}"`));

  return rows.join('\n');
}

function HorizontalBarChart({
  title,
  rows,
  colorClass,
}: {
  title: string;
  rows: GroupRow[];
  colorClass: string;
}) {
  const topRows = rows.slice(0, 6);
  const maxValue = Math.max(...topRows.map((r) => r.amount), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">{title}</h3>
      <div className="mt-4 space-y-3">
        {topRows.length === 0 ? (
          <p className="text-sm text-slate-400">No records for selected month.</p>
        ) : (
          topRows.map((row) => {
            const widthPercent = maxValue > 0 ? Math.max((row.amount / maxValue) * 100, 4) : 0;
            return (
              <div key={row.name}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-slate-700">{row.name}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {formatInr(row.amount)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${colorClass}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CompanyReportsPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const load = useCallback(() => {
    setLoading(true);
    expensesService
      .list()
      .then((res) => setExpenses(res.data ?? []))
      .catch((err: unknown) => {
        setExpenses([]);
        toast.error(getApiErrorMessage(err, 'Failed to load reports'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = expenseDate(e);
      if (!d) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  const totalExpense = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [monthExpenses],
  );

  const vehicleWise = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => {
      const label =
        typeof e.vehicleId === 'object' && e.vehicleId?.registrationNumber
          ? e.vehicleId.registrationNumber
          : 'Unknown Vehicle';
      map.set(label, (map.get(label) ?? 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const ownerWise = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => {
      const owner = ownerLabel(e);
      map.set(owner, (map.get(owner) ?? 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const categoryWise = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => {
      const label = categoryLabel(e.category);
      map.set(label, (map.get(label) ?? 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const handleExportCsv = () => {
    const content = buildCsv(
      selectedMonth,
      totalExpense,
      vehicleWise,
      ownerWise,
      categoryWise,
    );
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company_report_${selectedMonth.replace('-', '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Company-level overview and performance analysis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
          />
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Total Expense Report
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {loading ? 'Loading...' : formatInr(totalExpense)}
        </p>
        <p className="mt-1 text-sm text-slate-500">{monthLabel(selectedMonth)}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Vehicle-wise Report
          </h2>
          <div className="mt-4 space-y-2">
            {vehicleWise.length === 0 ? (
              <p className="text-sm text-slate-400">No records for selected month.</p>
            ) : (
              vehicleWise.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{row.name}</span>
                  <span className="font-semibold text-slate-900">{formatInr(row.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Owner-wise Report
          </h2>
          <div className="mt-4 space-y-2">
            {ownerWise.length === 0 ? (
              <p className="text-sm text-slate-400">No records for selected month.</p>
            ) : (
              ownerWise.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{row.name}</span>
                  <span className="font-semibold text-slate-900">{formatInr(row.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            Category Report
          </h2>
          <div className="mt-4 space-y-2">
            {categoryWise.length === 0 ? (
              <p className="text-sm text-slate-400">No records for selected month.</p>
            ) : (
              categoryWise.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{row.name}</span>
                  <span className="font-semibold text-slate-900">{formatInr(row.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <HorizontalBarChart
          title="Category Breakdown Chart"
          rows={categoryWise}
          colorClass="bg-fleet-500"
        />
        <HorizontalBarChart
          title="Vehicle Expense Chart"
          rows={vehicleWise}
          colorClass="bg-sky-500"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <FileBarChart2 className="h-4 w-4" />
          Report Snapshot
        </div>
        <p className="mt-2">
          {loading
            ? 'Loading report data...'
            : `${monthLabel(selectedMonth)} total ${formatInr(
                totalExpense,
              )} across ${vehicleWise.length} vehicle(s), ${ownerWise.length} owner(s), and ${
                categoryWise.length
              } category groups.`}
        </p>
      </section>
    </div>
  );
}
