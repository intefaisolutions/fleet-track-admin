import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {  ChevronLeft,
  ChevronRight,
  Download,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { expensesService, type CreateExpensePayload, type ExpenseRecord } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { ROUTES } from '../../config/constants';
import { getApiErrorMessage } from '../../utils/validation';

const PAGE_SIZE = 10;
const CATEGORIES = ['FUEL', 'SERVICE', 'TOLL', 'INSURANCE', 'PUC', 'CHALLAN', 'OTHER'] as const;

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
  SERVICE: 'Service',
  TOLL: 'Toll',
  INSURANCE: 'Insurance',
  PUC: 'PUC',
  CHALLAN: 'Challan',
  OTHER: 'Other',
};

const DUMMY_VEHICLES: VehicleRecord[] = [
  { _id: 'owner-v-1', registrationNumber: 'HR 26 AB 1234', make: 'Tata', modelName: 'Ace', status: 'ACTIVE' },
  { _id: 'owner-v-2', registrationNumber: 'DL 01 CD 5678', make: 'Mahindra', modelName: 'Bolero', status: 'ACTIVE' },
];

const DUMMY_EXPENSES: ExpenseRecord[] = [
  {
    _id: 'owner-exp-1',
    vehicleId: { _id: 'owner-v-1', registrationNumber: 'HR 26 AB 1234', make: 'Tata', modelName: 'Ace' },
    category: 'FUEL',
    amount: 3450,
    description: 'Indian Oil fuel refill',
    expenseDate: '2026-03-15T10:00:00.000Z',
  },
  {
    _id: 'owner-exp-2',
    vehicleId: { _id: 'owner-v-1', registrationNumber: 'HR 26 AB 1234', make: 'Tata', modelName: 'Ace' },
    category: 'SERVICE',
    amount: 14000,
    description: 'Engine service',
    expenseDate: '2026-03-18T10:00:00.000Z',
  },
  {
    _id: 'owner-exp-3',
    vehicleId: { _id: 'owner-v-2', registrationNumber: 'DL 01 CD 5678', make: 'Mahindra', modelName: 'Bolero' },
    category: 'TOLL',
    amount: 1450,
    description: 'Delhi-Jaipur toll',
    expenseDate: '2026-03-19T10:00:00.000Z',
  },
];

function categoryLabel(v: string) {
  return CATEGORY_LABELS[v] ?? v;
}

function formatInr(n: number) {
  return `Rs ${n.toLocaleString('en-IN')}`;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function vehicleId(v?: ExpenseRecord['vehicleId']): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v._id ?? '';
}

function vehicleReg(v?: ExpenseRecord['vehicleId']): string {
  if (!v || typeof v === 'string') return '—';
  return v.registrationNumber ?? '—';
}

function exportCsv(rows: ExpenseRecord[]) {
  const header = ['Date', 'Vehicle', 'Category', 'Amount', 'Description'];
  const lines = rows.map((r) => [
    formatDate(r.expenseDate ?? r.createdAt),
    vehicleReg(r.vehicleId),
    categoryLabel(r.category),
    r.amount,
    r.description ?? '',
  ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'owner_expenses.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function ExpenseFormModal({
  open,
  vehicles,
  initial,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  vehicles: VehicleRecord[];
  initial?: ExpenseRecord | null;
  onClose: () => void;
  onSubmit: (payload: CreateExpensePayload & { id?: string }) => void;
  loading: boolean;
}) {
  const isEdit = Boolean(initial?._id);
  const [vehicleIdValue, setVehicleIdValue] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('FUEL');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setVehicleIdValue(vehicleId(initial.vehicleId));
      setCategory((initial.category as (typeof CATEGORIES)[number]) || 'FUEL');
      setAmount(String(initial.amount ?? ''));
      setDescription(initial.description ?? '');
      setExpenseDate((initial.expenseDate ?? '').slice(0, 10));
      setReceipt(initial.receiptUrl ?? '');
    } else {
      setVehicleIdValue(vehicles[0]?._id ?? '');
      setCategory('FUEL');
      setAmount('');
      setDescription('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setReceipt('');
    }
  }, [open, initial, vehicles]);

  if (!open) return null;

  const handleReceiptFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReceipt(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!vehicleIdValue || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error('Please enter valid expense details');
      return;
    }
    onSubmit({
      id: initial?._id,
      vehicleId: vehicleIdValue,
      category,
      amount: parsedAmount,
      description: description.trim() || undefined,
      expenseDate: expenseDate || undefined,
      receiptUrl: receipt || undefined,
    });
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
            <p className="text-sm text-slate-500">Record all expense types with receipt proof.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <select required value={vehicleIdValue} onChange={(e) => setVehicleIdValue(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            {vehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNumber}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
            <input type="number" min={0} step="1" required placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          <textarea rows={3} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          <div className="rounded-lg border border-dashed border-slate-200 p-3">
            <label className="block text-xs font-semibold text-slate-600">Receipt Image</label>
            <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => handleReceiptFile(e.target.files?.[0] ?? null)} className="mt-2 text-xs" />
            {receipt && <p className="mt-2 text-xs text-emerald-700">Receipt attached</p>}
          </div>
          <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
          </button>
        </form>
      </div>
    </>
  );
}

export function OwnerExpensesPage() {
  const navigate = useNavigate();
  const { search = '' } = useOutletContext<{ search?: string }>();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseRecord | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([expensesService.list(), vehiclesService.list()])
      .then(([expRes, vehRes]) => {
        const apiExpenses = expRes.status === 'fulfilled' ? expRes.value.data ?? [] : [];
        const apiVehicles = vehRes.status === 'fulfilled' ? vehRes.value.data ?? [] : [];

        if ((expRes.status === 'rejected' || vehRes.status === 'rejected') && apiExpenses.length === 0) {
          setExpenses(DUMMY_EXPENSES);
          setVehicles(apiVehicles.length > 0 ? apiVehicles : DUMMY_VEHICLES);
          setDemoMode(true);
          toast.info('Showing demo expenses');
        } else {
          setExpenses(apiExpenses);
          setVehicles(apiVehicles);
          setDemoMode(false);
        }
      })
      .catch((err: unknown) => {
        setExpenses(DUMMY_EXPENSES);
        setVehicles(DUMMY_VEHICLES);
        setDemoMode(true);
        toast.info('Showing demo expenses');
        toast.error(getApiErrorMessage(err, 'Failed to load expenses'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      const reg = vehicleReg(e.vehicleId).toLowerCase();
      const matchSearch = !q || reg.includes(q) || (e.description ?? '').toLowerCase().includes(q) || categoryLabel(e.category).toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (vehicleFilter && vehicleId(e.vehicleId) !== vehicleFilter) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      const d = new Date(e.expenseDate ?? e.createdAt ?? '');
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [expenses, search, vehicleFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [search, vehicleFilter, categoryFilter, dateFrom, dateTo]);

  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreateOrUpdate = async (payload: CreateExpensePayload & { id?: string }) => {
    setSaving(true);
    try {
      if (demoMode) {
        const vehicleObj = vehicles.find((v) => v._id === payload.vehicleId);
        if (payload.id) {
          setExpenses((prev) => prev.map((x) => x._id === payload.id ? {
            ...x,
            category: payload.category,
            amount: payload.amount,
            description: payload.description,
            expenseDate: payload.expenseDate,
            receiptUrl: payload.receiptUrl,
            vehicleId: vehicleObj ? { _id: vehicleObj._id, registrationNumber: vehicleObj.registrationNumber, make: vehicleObj.make, modelName: vehicleObj.modelName } : x.vehicleId,
          } : x));
          toast.success('Expense updated (demo)');
        } else {
          setExpenses((prev) => [{
            _id: `demo-${Date.now()}`,
            category: payload.category,
            amount: payload.amount,
            description: payload.description,
            expenseDate: payload.expenseDate,
            receiptUrl: payload.receiptUrl,
            vehicleId: vehicleObj ? { _id: vehicleObj._id, registrationNumber: vehicleObj.registrationNumber, make: vehicleObj.make, modelName: vehicleObj.modelName } : payload.vehicleId,
          }, ...prev]);
          toast.success('Expense added (demo)');
        }
      } else {
        if (payload.id) {
          await expensesService.update(payload.id, payload);
          toast.success('Expense updated');
        } else {
          await expensesService.create(payload);
          toast.success('Expense added');
        }
        load();
      }
      setOpen(false);
      setEditExpense(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      if (demoMode) {
        setExpenses((prev) => prev.filter((x) => x._id !== id));
        toast.success('Expense deleted (demo)');
      } else {
        await expensesService.remove(id);
        toast.success('Expense deleted');
        load();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Expense Management</h1>
          <p className="mt-1 text-sm text-slate-500">Record, edit, view, and delete all your vehicle expenses with receipt proofs.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button type="button" onClick={() => navigate(ROUTES.OWNER_ADD_EXPENSE)} className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600">
            <Plus className="h-4 w-4" /> Add Expense
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">All Vehicles</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNumber}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
        <div className="rounded-xl bg-sky-50 px-4 py-2.5 text-sky-900">
          <p className="text-xs">Filtered Total</p>
          <p className="text-lg font-bold">{formatInr(totalAmount)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading expenses...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No expenses found.</td></tr>
              ) : pageRows.map((e) => (
                <tr key={e._id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-600">{formatDate(e.expenseDate ?? e.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{vehicleReg(e.vehicleId)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.OTHER}`}>{categoryLabel(e.category)}</span>
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatInr(Number(e.amount))}</td>
                  <td className="px-4 py-3">{e.receiptUrl ? <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-fleet-600"><Paperclip className="h-4 w-4" /></a> : <Paperclip className="h-4 w-4 text-slate-300" />}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => { setEditExpense(e); setOpen(true); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-fleet-600"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDelete(e._id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{filtered.length === 0 ? '0 entries' : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} entries`}{demoMode ? ' (demo data)' : ''}</p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => <button key={p} type="button" onClick={() => setPage(p)} className={`min-w-8 rounded-lg px-2 py-1 text-sm ${p === page ? 'bg-fleet-500 text-white' : 'hover:bg-slate-100'}`}>{p}</button>)}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <ExpenseFormModal open={open} vehicles={vehicles} initial={editExpense} onClose={() => { setOpen(false); setEditExpense(null); }} onSubmit={handleCreateOrUpdate} loading={saving} />
    </div>
  );
}




