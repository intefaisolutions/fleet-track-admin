import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadImage } from '../../services/storage.service';
import { getApiErrorMessage } from '../../utils/validation';
import {
  EXPENSE_CATEGORY_ORDER,
  amountFieldLabel,
  computeExpenseAmount,
  emptyCategoryDetails,
  expenseCategoryLabel,
  getCategoryMeta,
  isAmountAutoCalculated,
  normalizeExpenseCategory,
  type CategoryDetails,
  type ExpenseCategoryCode,
} from '../../config/expenseCategories';
import type { VehicleRecord } from '../../services/vehicles.service';
import { ExpenseCategoryFields } from './ExpenseCategoryFields';
import { VehicleSelect } from './VehicleSelect';

export function ExpenseFormBody({
  vehicles,
  category,
  setCategory,
  vehicleId,
  setVehicleId,
  expenseDate,
  setExpenseDate,
  amount,
  setAmount,
  odometerKm,
  setOdometerKm,
  details,
  setDetails,
  receiptUrl,
  setReceiptUrl,
  vehiclesLoading = false,
}: {
  vehicles: VehicleRecord[];
  category: ExpenseCategoryCode;
  setCategory: (c: ExpenseCategoryCode) => void;
  vehicleId: string;
  setVehicleId: (id: string) => void;
  expenseDate: string;
  setExpenseDate: (d: string) => void;
  amount: string;
  setAmount: (a: string) => void;
  odometerKm: string;
  setOdometerKm: (k: string) => void;
  details: CategoryDetails;
  setDetails: (d: CategoryDetails) => void;
  receiptUrl: string;
  setReceiptUrl: (url: string) => void;
  vehiclesLoading?: boolean;
}) {
  const { user } = useAuth();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const meta = getCategoryMeta(category);
  const autoAmount = isAmountAutoCalculated(category);

  const computed = useMemo(
    () => computeExpenseAmount(category, details, amount),
    [category, details, amount],
  );

  useEffect(() => {
    if (autoAmount && computed > 0) {
      setAmount(String(computed));
    }
  }, [autoAmount, computed, setAmount]);

  const onReceiptFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt image must be under 5MB');
      return;
    }
    setUploadingReceipt(true);
    try {
      const { url } = await uploadImage(file, 'receipts');
      setReceiptUrl(url);
      toast.success('Receipt uploaded to cloud storage');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Receipt upload failed'));
    } finally {
      setUploadingReceipt(false);
    }
  };

  const recordedByLabel =
    user?.role === 'DRIVER'
      ? `Driver: ${user.fullName}`
      : `Owner: ${user?.fullName ?? 'User'}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Date *</label>
          <input
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Expense Category *</label>
          <select
            value={category}
            onChange={(e) => {
              const c = normalizeExpenseCategory(e.target.value);
              setCategory(c);
              setDetails(emptyCategoryDetails(c));
              if (!getCategoryMeta(c).showOdometer) setOdometerKm('');
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

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Vehicle *</label>
          <VehicleSelect
            vehicles={vehicles}
            value={vehicleId}
            onChange={setVehicleId}
            loading={vehiclesLoading}
          />
        </div>

        {meta.showOdometer && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Odometer Reading (km) *</label>
            <input
              type="number"
              min={0}
              required
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
              placeholder="e.g. 45500"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
        )}

        {!autoAmount && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {amountFieldLabel(category)} *
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Recorded By</label>
          <input
            type="text"
            readOnly
            value={recordedByLabel}
            className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {expenseCategoryLabel(category)} — required fields (SRS {meta.srs})
        </p>
        <ExpenseCategoryFields category={category} details={details} setDetails={setDetails} />
      </div>

      {autoAmount && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {amountFieldLabel(category)} *
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            readOnly
            value={amount}
            placeholder="Calculated from fields above"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
          />
        </div>
      )}

      {meta.showReceipt && (
        <div className="rounded-lg border border-dashed border-slate-200 p-3">
          <label className="mb-2 block text-xs font-semibold text-slate-600">
            Receipt Image {category === 'FUEL' ? '(optional)' : ''}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${uploadingReceipt ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Upload className="h-4 w-4" />
              {uploadingReceipt ? 'Uploading…' : 'Upload Receipt'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                disabled={uploadingReceipt}
                onChange={(e) => void onReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Receipt saved (Supabase)
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
