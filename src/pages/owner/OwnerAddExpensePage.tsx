import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { expensesService, type CreateExpensePayload } from '../../services/expenses.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

const CATEGORIES = ['FUEL', 'SERVICE', 'TOLL', 'INSURANCE', 'PUC', 'CHALLAN', 'OTHER'] as const;

type Category = (typeof CATEGORIES)[number];

type CategoryDetails = Record<string, string>;

function categoryLabel(v: string) {
  const map: Record<string, string> = {
    FUEL: 'Fuel',
    SERVICE: 'Service',
    TOLL: 'Toll',
    INSURANCE: 'Insurance',
    PUC: 'PUC',
    CHALLAN: 'Challan',
    OTHER: 'Other',
  };
  return map[v] ?? v;
}

function emptyDetails(category: Category): CategoryDetails {
  switch (category) {
    case 'FUEL':
      return { stationName: '', litres: '', ratePerLitre: '' };
    case 'SERVICE':
      return { serviceCenter: '', serviceType: '' };
    case 'TOLL':
      return { tollBooth: '', route: '' };
    case 'INSURANCE':
      return { policyNumber: '', provider: '' };
    case 'PUC':
      return { certificateNumber: '', validTill: '' };
    case 'CHALLAN':
      return { challanNumber: '', reason: '' };
    default:
      return { notes: '' };
  }
}

function DynamicFields({
  category,
  details,
  setDetails,
}: {
  category: Category;
  details: CategoryDetails;
  setDetails: (next: CategoryDetails) => void;
}) {
  const input = (key: string, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <input
        type={type}
        value={details[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
      />
    </div>
  );

  switch (category) {
    case 'FUEL':
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {input('stationName', 'Fuel Station', 'text', 'Indian Oil')}
          {input('litres', 'Litres', 'number', '45')}
          {input('ratePerLitre', 'Rate/Litre', 'number', '98')}
        </div>
      );
    case 'SERVICE':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {input('serviceCenter', 'Service Center', 'text', 'Tata Workshop')}
          {input('serviceType', 'Service Type', 'text', 'Engine / Oil')}
        </div>
      );
    case 'TOLL':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {input('tollBooth', 'Toll Booth', 'text', 'Gurgaon Border')}
          {input('route', 'Route', 'text', 'Delhi-Jaipur')}
        </div>
      );
    case 'INSURANCE':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {input('policyNumber', 'Policy Number', 'text', 'POL12345')}
          {input('provider', 'Provider', 'text', 'ICICI Lombard')}
        </div>
      );
    case 'PUC':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {input('certificateNumber', 'Certificate Number', 'text', 'PUC9988')}
          {input('validTill', 'Valid Till', 'date')}
        </div>
      );
    case 'CHALLAN':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {input('challanNumber', 'Challan Number', 'text', 'CH123')}
          {input('reason', 'Reason', 'text', 'Over speed')}
        </div>
      );
    default:
      return <div>{input('notes', 'Notes', 'text', 'Additional details')}</div>;
  }
}

export function OwnerAddExpensePage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [category, setCategory] = useState<Category>('FUEL');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [details, setDetails] = useState<CategoryDetails>(emptyDetails('FUEL'));
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
      categoryDetails: details,
    }),
    [vehicleId, category, amount, description, expenseDate, receiptUrl, details],
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
          <p className="mt-1 text-sm text-slate-500">Category choose karte hi fields automatically change hongi.</p>
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
                const c = e.target.value as Category;
                setCategory(c);
                setDetails(emptyDetails(c));
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
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
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Category specific fields</p>
          <DynamicFields category={category} details={details} setDetails={setDetails} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fuel: Rs 3450 at Indian Oil"
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
