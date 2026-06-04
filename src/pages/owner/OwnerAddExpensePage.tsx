import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { ExpenseCategoryFields } from '../../components/expenses/ExpenseCategoryFields';
import {
  EXPENSE_CATEGORY_ORDER,
  emptyCategoryDetails,
  expenseCategoryLabel,
  normalizeExpenseCategory,
  sanitizeCategoryDetails,
  type CategoryDetails,
  type ExpenseCategoryCode,
} from '../../config/expenseCategories';
import { ROUTES } from '../../config/constants';
import { expensesService, type CreateExpensePayload } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

export function OwnerAddExpensePage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState<ExpenseCategoryCode>('FUEL');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometerKm, setOdometerKm] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [details, setDetails] = useState<CategoryDetails>(emptyCategoryDetails('FUEL'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    vehiclesService
      .list()
      .then((res) => {
        const list = res.data ?? [];
        setVehicles(list);
        setVehicleId(list[0]?._id ?? '');
      })
      .catch((err: unknown) => {
        setVehicles([]);
        toast.error(getApiErrorMessage(err, 'Failed to load vehicles'));
      });
  }, []);

  const payload = useMemo(
    () => ({
      vehicleId,
      category,
      amount: Number(amount || 0),
      description: description.trim() || undefined,
      expenseDate,
      receiptUrl: receiptUrl || undefined,
      odometerKm: odometerKm ? Number(odometerKm) : undefined,
      categoryDetails: sanitizeCategoryDetails(category, details),
    }),
    [vehicleId, category, amount, description, expenseDate, receiptUrl, odometerKm, details],
  );

  const onReceiptFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReceiptUrl(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleId || Number.isNaN(payload.amount) || payload.amount <= 0) {
      toast.error('Please enter valid vehicle and amount');
      return;
    }
    setLoading(true);
    try {
      await expensesService.create(payload as CreateExpensePayload);
      toast.success('Expense added successfully');
      navigate(ROUTES.OWNER_EXPENSES);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to add expense'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Expense</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose one of {EXPENSE_CATEGORY_ORDER.length} categories — fields update automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.OWNER_EXPENSES)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Vehicle *</label>
            <select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Expense Category *</label>
            <select
              value={category}
              onChange={(e) => {
                const c = normalizeExpenseCategory(e.target.value);
                setCategory(c);
                setDetails(emptyCategoryDetails(c));
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              {EXPENSE_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {expenseCategoryLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Amount *</label>
            <input
              type="number"
              min={0}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="3450"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Expense Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>

          {category === 'FUEL' && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Odometer (km)</label>
              <input
                type="number"
                min={0}
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                placeholder="For fuel efficiency reports"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {expenseCategoryLabel(category)} — category fields
          </p>
          <ExpenseCategoryFields category={category} details={details} setDetails={setDetails} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description (optional)</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note if needed"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>

        <div className="rounded-lg border border-dashed border-slate-200 p-3">
          <label className="mb-2 block text-xs font-semibold text-slate-600">Receipt Image</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" /> Upload Receipt
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => onReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {receiptUrl && <span className="text-xs text-emerald-700">Receipt attached</span>}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
