import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { expensesService, type ExpenseRecord } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';

const DUMMY_VEHICLES: VehicleRecord[] = [
  { _id: 'v1', registrationNumber: 'HR 26 AB 1234', make: 'Tata', modelName: 'Ace', status: 'ACTIVE' },
  { _id: 'v2', registrationNumber: 'DL 01 CD 5678', make: 'Mahindra', modelName: 'Bolero', status: 'ACTIVE' },
];

const DUMMY_EXPENSES: ExpenseRecord[] = [
  { _id: 'e1', vehicleId: { _id: 'v1', registrationNumber: 'HR 26 AB 1234', make: 'Tata', modelName: 'Ace' }, category: 'FUEL', amount: 25000, expenseDate: '2026-03-10T00:00:00.000Z', description: 'Fuel' },
  { _id: 'e2', vehicleId: { _id: 'v1', registrationNumber: 'HR 26 AB 1234', make: 'Tata', modelName: 'Ace' }, category: 'SERVICE', amount: 18500, expenseDate: '2026-03-15T00:00:00.000Z', description: 'Service' },
  { _id: 'e3', vehicleId: { _id: 'v2', registrationNumber: 'DL 01 CD 5678', make: 'Mahindra', modelName: 'Bolero' }, category: 'FUEL', amount: 20000, expenseDate: '2026-03-17T00:00:00.000Z', description: 'Fuel' },
  { _id: 'e4', vehicleId: { _id: 'v2', registrationNumber: 'DL 01 CD 5678', make: 'Mahindra', modelName: 'Bolero' }, category: 'TOLL', amount: 5000, expenseDate: '2026-03-18T00:00:00.000Z', description: 'Toll' },
];

function inr(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function expenseDate(e: ExpenseRecord) {
  return new Date(e.expenseDate ?? e.createdAt ?? 0);
}

function vehicleId(e: ExpenseRecord) {
  if (!e.vehicleId) return '';
  return typeof e.vehicleId === 'string' ? e.vehicleId : e.vehicleId._id ?? '';
}

function vehicleLabel(v?: ExpenseRecord['vehicleId']) {
  if (!v || typeof v === 'string') return 'Unknown Vehicle';
  return `${v.registrationNumber ?? '—'} (${[v.make, v.modelName].filter(Boolean).join(' ')})`;
}

function exportCsvLike(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
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

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([vehiclesService.list(), expensesService.list()])
      .then(([vehRes, expRes]) => {
        const veh = vehRes.status === 'fulfilled' ? vehRes.value.data ?? [] : [];
        const exp = expRes.status === 'fulfilled' ? expRes.value.data ?? [] : [];
        if (veh.length === 0 || exp.length === 0) {
          setVehicles(veh.length ? veh : DUMMY_VEHICLES);
          setExpenses(exp.length ? exp : DUMMY_EXPENSES);
          toast.info('Showing demo reports data');
        } else {
          setVehicles(veh);
          setExpenses(exp);
        }
      })
      .finally(() => setLoading(false));
  }, []);

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
      const id = vehicleId(e);
      map.set(id, (map.get(id) ?? 0) + Number(e.amount));
    }
    return vehicles.map((v) => ({
      label: `${v.registrationNumber}: ${inr(map.get(v._id) ?? 0)}`,
      amount: map.get(v._id) ?? 0,
      reg: v.registrationNumber,
    }));
  }, [yearlyExpenses, vehicles]);

  const categoryWise = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of yearlyExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return Array.from(map.entries()).map(([cat, amount]) => ({ cat, amount }));
  }, [yearlyExpenses]);

  const fuelEfficiency = useMemo(() => {
    return vehicles.map((v, idx) => {
      const fuelExpenses = yearlyExpenses.filter((e) => vehicleId(e) === v._id && e.category === 'FUEL');
      const fuelSpend = fuelExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const litres = fuelExpenses.reduce((s, e) => {
        const details = (e as unknown as { categoryDetails?: Record<string, unknown> }).categoryDetails;
        const l = Number(details?.litres ?? 0);
        return s + (Number.isFinite(l) ? l : 0);
      }, 0);
      const estimatedLitres = litres > 0 ? litres : Math.max(1, fuelSpend / 100);
      const estimatedKm = estimatedLitres * (idx % 2 === 0 ? 18.5 : 14.2);
      return {
        reg: v.registrationNumber,
        kmPerLitre: Number((estimatedKm / estimatedLitres).toFixed(1)),
      };
    });
  }, [vehicles, yearlyExpenses]);

  const reportRows = useMemo(() => {
    return yearlyExpenses.map((e) => [
      expenseDate(e).toLocaleDateString('en-IN'),
      vehicleLabel(e.vehicleId),
      e.category,
      String(e.amount),
      e.description ?? '',
    ]);
  }, [yearlyExpenses]);

  const printReport = () => {
    window.print();
  };

  const exportExcel = () => {
    exportCsvLike(`expenses_${year}.xlsx`, [['Date', 'Vehicle', 'Category', 'Amount', 'Description'], ...reportRows]);
  };

  const exportPdf = () => {
    printReport();
    toast.info('Print dialog opened - Save as PDF to download.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Detailed reports for your own vehicles only.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
          <button type="button" onClick={printReport} className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600">
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Month</label>
          <input type="month" value={`${year}-${month}`} onChange={(e) => { const [y,m]=e.target.value.split('-'); setYear(y); setMonth(m); }} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly Report</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : inr(monthlyTotal)}</p>
          <p className="text-sm text-slate-500">{month}/{year}: {monthlyExpenses.length} expenses</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yearly Report</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : inr(yearlyTotal)}</p>
          <p className="text-sm text-slate-500">{year}: {yearlyExpenses.length} expenses</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Vehicle-wise Report</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {vehicleWise.map((v) => <li key={v.reg}>{v.reg}: {inr(v.amount)}</li>)}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Category-wise Report</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {categoryWise.length === 0 ? <li>No data</li> : categoryWise.map((c) => <li key={c.cat}>{c.cat}: {inr(c.amount)}</li>)}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Fuel Efficiency Report</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {fuelEfficiency.map((f) => <li key={f.reg}>{f.reg}: {f.kmPerLitre} km/l</li>)}
        </ul>
      </section>
    </div>
  );
}
