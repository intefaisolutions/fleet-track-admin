import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { expensesService, type ExpenseRecord } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: 'Fuel',
  SERVICE: 'Service',
  TOLL: 'Toll',
  INSURANCE: 'Insurance',
  PUC: 'PUC',
  CHALLAN: 'Challan',
  OTHER: 'Other',
};

function inr(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
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

export function OwnerReportsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  const categoryWise = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of yearlyExpenses) {
      const label = categoryLabel(e.category);
      map.set(label, (map.get(label) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries()).map(([cat, amount]) => ({ cat, amount }));
  }, [yearlyExpenses]);

  const fuelEfficiency = useMemo(() => {
    return vehicles.map((v) => {
      const fuelExpenses = yearlyExpenses.filter(
        (e) => vehicleIdOf(e) === String(v._id) && e.category === 'FUEL',
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
      categoryLabel(e.category),
      String(e.amount),
      e.description ?? '',
    ]);
  }, [yearlyExpenses]);

  const printReport = () => {
    window.print();
  };

  const exportExcel = () => {
    exportCsvLike(`owner_expenses_${year}.csv`, [
      ['Date', 'Vehicle', 'Category', 'Amount', 'Description'],
      ...reportRows,
    ]);
    toast.success('Report exported');
  };

  const exportPdf = () => {
    printReport();
    toast.info('Print dialog opened — save as PDF to download.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Detailed reports for your own vehicles only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600"
          >
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Monthly Report
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : inr(monthlyTotal)}
          </p>
          <p className="text-sm text-slate-500">
            {month}/{year}: {monthlyExpenses.length} expenses
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Yearly Report
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : inr(yearlyTotal)}
          </p>
          <p className="text-sm text-slate-500">
            {year}: {yearlyExpenses.length} expenses
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Vehicle-wise Report</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
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
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Category-wise Report</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {loading ? (
              <li className="text-slate-400">Loading...</li>
            ) : categoryWise.length === 0 ? (
              <li className="text-slate-400">No data</li>
            ) : (
              categoryWise.map((c) => (
                <li key={c.cat}>
                  {c.cat}: {inr(c.amount)}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Fuel Efficiency Report</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
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
      </section>
    </div>
  );
}
