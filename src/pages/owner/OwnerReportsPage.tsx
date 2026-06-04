import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { Check, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { expensesService, type ExpenseRecord } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import {
  buildCategoryStats,
  expenseCategoryLabel,
  normalizeExpenseCategory,
} from '../../config/expenseCategories';
import { getApiErrorMessage } from '../../utils/validation';

const REPORT_IDS = [
  'monthly',
  'yearly',
  'vehicle',
  'category',
  'fuel',
  'detail',
] as const;

type ReportId = (typeof REPORT_IDS)[number];

const DEFAULT_SELECTED = new Set<ReportId>(REPORT_IDS);

function inr(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function expenseDate(e: ExpenseRecord) {
  return new Date(e.expenseDate ?? e.createdAt ?? 0);
}

function vehicleIdOf(e: ExpenseRecord): string {
  if (!e.vehicleId) return '';
  const id = typeof e.vehicleId === 'string' ? e.vehicleId : e.vehicleId._id;
  return id ? String(id) : '';
}

function vehicleLabel(v?: ExpenseRecord['vehicleId']) {
  if (!v || typeof v === 'string') return 'Unknown Vehicle';
  const title = [v.make, v.modelName].filter(Boolean).join(' ');
  return `${v.registrationNumber ?? '—'}${title ? ` (${title})` : ''}`;
}

function exportCsvLike(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportSection({
  id,
  title,
  selected,
  onToggle,
  children,
  className = '',
}: {
  id: ReportId;
  title: string;
  selected: boolean;
  onToggle: (id: ReportId) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-white p-5 shadow-sm transition ${
        selected
          ? 'border-fleet-400 ring-2 ring-fleet-500/25'
          : 'border-slate-200 opacity-75'
      } ${className}`}
      data-report-id={id}
    >
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="mb-3 flex w-full items-center gap-3 text-left"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            selected
              ? 'border-fleet-500 bg-fleet-500 text-white'
              : 'border-slate-300 bg-white'
          }`}
          aria-hidden
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <span className="ml-auto text-xs font-medium text-slate-500">
          {selected ? 'Included in export' : 'Tap to include'}
        </span>
      </button>
      <div className={selected ? '' : 'pointer-events-none'}>{children}</div>
    </section>
  );
}

export function OwnerReportsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<Set<ReportId>>(
    () => new Set(DEFAULT_SELECTED),
  );

  const toggleReport = (id: ReportId) => {
    setSelectedReports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) {
          toast.info('At least one report must stay selected');
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllReports = () => setSelectedReports(new Set(DEFAULT_SELECTED));

  const isSelected = (id: ReportId) => selectedReports.has(id);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([vehiclesService.list(), expensesService.list()])
      .then(([vehRes, expRes]) => {
        const veh = vehRes.data ?? [];
        const exp = expRes.data ?? [];
        const vehicleIds = new Set(veh.map((v) => String(v._id)));
        const ownerExpenses = exp.filter((e) => {
          const vid = vehicleIdOf(e);
          return !vid || vehicleIds.has(vid);
        });
        setVehicles(veh);
        setExpenses(ownerExpenses);
      })
      .catch((err: unknown) => {
        setVehicles([]);
        setExpenses([]);
        toast.error(getApiErrorMessage(err, 'Failed to load reports'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = expenseDate(e);
      return d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month);
    });
  }, [expenses, year, month]);

  const yearlyExpenses = useMemo(() => {
    return expenses.filter((e) => expenseDate(e).getFullYear() === Number(year));
  }, [expenses, year]);

  const monthlyTotal = monthlyExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const yearlyTotal = yearlyExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const vehicleWise = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of yearlyExpenses) {
      const id = vehicleIdOf(e);
      if (!id) continue;
      map.set(id, (map.get(id) ?? 0) + Number(e.amount));
    }

    const rows = vehicles.map((v) => ({
      reg: v.registrationNumber,
      amount: map.get(String(v._id)) ?? 0,
    }));

    map.forEach((amount, id) => {
      if (!vehicles.some((v) => String(v._id) === id)) {
        const exp = yearlyExpenses.find((e) => vehicleIdOf(e) === id);
        rows.push({
          reg:
            typeof exp?.vehicleId === 'object' && exp.vehicleId?.registrationNumber
              ? exp.vehicleId.registrationNumber
              : 'Unknown',
          amount,
        });
      }
    });

    return rows;
  }, [yearlyExpenses, vehicles]);

  const categoryWise = useMemo(
    () => buildCategoryStats(yearlyExpenses),
    [yearlyExpenses],
  );

  const fuelEfficiency = useMemo(() => {
    return vehicles.map((v) => {
      const fuelExpenses = yearlyExpenses.filter(
        (e) => vehicleIdOf(e) === String(v._id) && normalizeExpenseCategory(e.category) === 'FUEL',
      );
      const fuelSpend = fuelExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const litres = fuelExpenses.reduce((s, e) => {
        const details = (e as ExpenseRecord & { categoryDetails?: { litres?: number } })
          .categoryDetails;
        const l = Number(details?.litres ?? 0);
        return s + (Number.isFinite(l) && l > 0 ? l : 0);
      }, 0);
      const odometerKm = fuelExpenses.reduce((s, e) => {
        const km = Number((e as ExpenseRecord & { odometerKm?: number }).odometerKm ?? 0);
        return s + (Number.isFinite(km) && km > 0 ? km : 0);
      }, 0);

      let kmPerLitre = 0;
      if (litres > 0 && odometerKm > 0) {
        kmPerLitre = odometerKm / litres;
      } else if (litres > 0) {
        kmPerLitre = 15;
      } else if (fuelSpend > 0) {
        kmPerLitre = 0;
      }

      return {
        reg: v.registrationNumber,
        kmPerLitre: Number(kmPerLitre.toFixed(1)),
        hasData: fuelExpenses.length > 0,
      };
    });
  }, [vehicles, yearlyExpenses]);

  const reportRows = useMemo(() => {
    return yearlyExpenses.map((e) => [
      expenseDate(e).toLocaleDateString('en-IN'),
      vehicleLabel(e.vehicleId),
      expenseCategoryLabel(e.category),
      String(e.amount),
      e.description ?? '',
    ]);
  }, [yearlyExpenses]);

  const buildExportCsv = () => {
    const rows: string[][] = [];
    const period = `${month}/${year}`;

    if (isSelected('monthly')) {
      rows.push(['Monthly Report', period]);
      rows.push(['Total', String(monthlyTotal)]);
      rows.push(['Expense count', String(monthlyExpenses.length)]);
      rows.push([]);
    }

    if (isSelected('yearly')) {
      rows.push(['Yearly Report', year]);
      rows.push(['Total', String(yearlyTotal)]);
      rows.push(['Expense count', String(yearlyExpenses.length)]);
      rows.push([]);
    }

    if (isSelected('vehicle')) {
      rows.push(['Vehicle-wise Report', year]);
      rows.push(['Registration', 'Amount']);
      vehicleWise.forEach((v) => rows.push([v.reg ?? '', String(v.amount)]));
      rows.push([]);
    }

    if (isSelected('category')) {
      rows.push(['Category-wise Report', year]);
      rows.push(['Category', 'Count', 'Amount']);
      categoryWise.forEach((c) =>
        rows.push([c.label, String(c.count), String(c.amount)]),
      );
      rows.push([]);
    }

    if (isSelected('fuel')) {
      rows.push(['Fuel Efficiency Report', year]);
      rows.push(['Registration', 'Km per litre']);
      fuelEfficiency.forEach((f) =>
        rows.push([
          f.reg ?? '',
          f.hasData && f.kmPerLitre > 0 ? String(f.kmPerLitre) : '',
        ]),
      );
      rows.push([]);
    }

    if (isSelected('detail')) {
      rows.push(['Expense detail', year]);
      rows.push(['Date', 'Vehicle', 'Category', 'Amount', 'Description']);
      rows.push(...reportRows);
    }

    return rows;
  };

  const printReport = () => {
    const style = document.createElement('style');
    style.id = 'owner-report-print-filter';
    const hideRules = REPORT_IDS.filter((id) => !selectedReports.has(id))
      .map((id) => `[data-report-id="${id}"] { display: none !important; }`)
      .join('\n');
    style.textContent = `@media print { ${hideRules} }`;
    document.head.appendChild(style);
    window.print();
    window.setTimeout(() => style.remove(), 1000);
  };

  const exportExcel = () => {
    const rows = buildExportCsv();
    if (rows.length === 0) {
      toast.error('Select at least one report to export');
      return;
    }
    exportCsvLike(`owner_reports_${year}_${month}.csv`, rows);
    toast.success('Selected reports exported');
  };

  const exportPdf = () => {
    printReport();
    toast.info('Print dialog opened — save as PDF. Only selected reports will appear.');
  };

  const selectedCount = selectedReports.size;

  return (
    <div className="owner-reports-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select individual reports below, then export or print only what you need.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={exportPdf}
            disabled={selectedCount === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={selectedCount === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <button
            type="button"
            onClick={printReport}
            disabled={selectedCount === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-50 sm:w-auto"
          >
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{selectedCount}</span> of{' '}
          {REPORT_IDS.length} reports selected for export / print
        </p>
        <button
          type="button"
          onClick={selectAllReports}
          className="text-sm font-semibold text-fleet-600 hover:text-fleet-700"
        >
          Select all
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Month</label>
          <input
            type="month"
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-');
              if (y) setYear(y);
              if (m) setMonth(m);
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <ReportSection
          id="monthly"
          title="Monthly Report"
          selected={isSelected('monthly')}
          onToggle={toggleReport}
        >
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? '—' : inr(monthlyTotal)}
          </p>
          <p className="text-sm text-slate-500">
            {month}/{year}: {monthlyExpenses.length} expenses
          </p>
        </ReportSection>

        <ReportSection
          id="yearly"
          title="Yearly Report"
          selected={isSelected('yearly')}
          onToggle={toggleReport}
        >
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? '—' : inr(yearlyTotal)}
          </p>
          <p className="text-sm text-slate-500">
            {year}: {yearlyExpenses.length} expenses
          </p>
        </ReportSection>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ReportSection
          id="vehicle"
          title="Vehicle-wise Report"
          selected={isSelected('vehicle')}
          onToggle={toggleReport}
        >
          <ul className="space-y-2 text-sm text-slate-700">
            {loading ? (
              <li className="text-slate-400">Loading...</li>
            ) : vehicleWise.length === 0 ? (
              <li className="text-slate-400">No expenses for selected year.</li>
            ) : (
              vehicleWise.map((v) => (
                <li key={v.reg}>
                  {v.reg}: {inr(v.amount)}
                </li>
              ))
            )}
          </ul>
        </ReportSection>

        <ReportSection
          id="category"
          title="Category-wise Report"
          selected={isSelected('category')}
          onToggle={toggleReport}
        >
          <ul className="space-y-2 text-sm text-slate-700">
            {loading ? (
              <li className="text-slate-400">Loading...</li>
            ) : categoryWise.every((c) => c.count === 0) ? (
              <li className="text-slate-400">No data for {year}</li>
            ) : (
              categoryWise.map((c) => (
                <li key={c.code}>
                  {c.label}: {c.count} · {inr(c.amount)}
                </li>
              ))
            )}
          </ul>
        </ReportSection>
      </section>

      <ReportSection
        id="fuel"
        title="Fuel Efficiency Report"
        selected={isSelected('fuel')}
        onToggle={toggleReport}
      >
        <ul className="space-y-2 text-sm text-slate-700">
          {loading ? (
            <li className="text-slate-400">Loading...</li>
          ) : fuelEfficiency.length === 0 ? (
            <li className="text-slate-400">No vehicles found.</li>
          ) : (
            fuelEfficiency.map((f) => (
              <li key={f.reg}>
                {f.reg}:{' '}
                {f.hasData && f.kmPerLitre > 0 ? `${f.kmPerLitre} km/l` : '—'}
              </li>
            ))
          )}
        </ul>
      </ReportSection>

      <ReportSection
        id="detail"
        title="Expense Detail (line items)"
        selected={isSelected('detail')}
        onToggle={toggleReport}
      >
        <p className="mb-3 text-xs text-slate-500">
          Full list for {year} — included in Excel export when selected.
        </p>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 font-semibold text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-400">
                    No expenses in {year}
                  </td>
                </tr>
              ) : (
                reportRows.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-600">{row[0]}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row[1]}</td>
                    <td className="px-3 py-2">{row[2]}</td>
                    <td className="px-3 py-2 font-semibold">{inr(Number(row[3]))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {reportRows.length > 50 && (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              Showing 50 of {reportRows.length} — full list in export.
            </p>
          )}
        </div>
      </ReportSection>
    </div>
  );
}
