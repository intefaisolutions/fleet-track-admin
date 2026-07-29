import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Upload, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadImage } from '../../services/storage.service';
import { formatGroupedNumber, formatInr } from '../../utils/currency';
import { getApiErrorMessage } from '../../utils/validation';
import {
  EXPENSE_CATEGORY_ORDER,
  amountFieldLabel,
  computeElectricTotalAmount,
  computeExpenseAmount,
  emptyCategoryDetails,
  expenseCategoryLabel,
  getCategoryMeta,
  getFuelQuantityUnit,
  isAmountAutoCalculated,
  isCngFuelType,
  isElectricFuelType,
  normalizeExpenseCategory,
  parseDecimalInput,
  type CategoryDetails,
  type ExpenseCategoryCode,
} from '../../config/expenseCategories';
import type { VehicleRecord } from '../../services/vehicles.service';
import { ExpenseCategoryFields } from './ExpenseCategoryFields';
import { VehicleSelect } from './VehicleSelect';

function formatMoneyDisplay(value: number): string {
  if (!value || value <= 0) return '';
  return formatGroupedNumber(value, { allowDecimal: true });
}

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
  const isFuel = category === 'FUEL';

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v._id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );
  const fuelType = selectedVehicle?.fuelType ?? null;
  const isElectric = isFuel && isElectricFuelType(fuelType);
  const isCng = isFuel && isCngFuelType(fuelType);
  const fuelUnit = getFuelQuantityUnit(fuelType);

  const computed = useMemo(
    () => computeExpenseAmount(category, details, amount, fuelType),
    [category, details, amount, fuelType],
  );

  const fuelPreview = useMemo(() => {
    if (!isFuel || isElectric) return null;
    const cost = parseDecimalInput(details.pricePerLitre || details.ratePerLitre);
    const quantity = parseDecimalInput(details.litres);
    const total = computeExpenseAmount('FUEL', details, undefined, fuelType);
    return { cost, quantity, total };
  }, [isFuel, isElectric, details, fuelType]);

  const electricPreview = useMemo(() => {
    if (!isElectric) return null;
    const energy = parseDecimalInput(details.energyNeeded);
    const rate = parseDecimalInput(details.electricityRate);
    let efficiency = parseDecimalInput(details.chargingEfficiency);
    const total = computeElectricTotalAmount(details);
    if (efficiency != null && efficiency > 1) efficiency = efficiency / 100;
    return { energy, rate, efficiency, total };
  }, [isElectric, details]);

  // Live sync auto amount
  useEffect(() => {
    if (!autoAmount) return;
    setAmount(computed > 0 ? formatMoneyDisplay(computed) : '');
  }, [autoAmount, computed, setAmount]);

  const handleVehicleChange = (id: string) => {
    setVehicleId(id);
    if (category === 'FUEL') {
      const nextFuel = vehicles.find((v) => v._id === id)?.fuelType;
      setDetails(emptyCategoryDetails('FUEL', nextFuel));
      setAmount('');
    }
  };

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

  const sectionTitle = isElectric
    ? 'Electric Charging — required fields (SRS 8.1)'
    : `${expenseCategoryLabel(category)} — required fields (SRS ${meta.srs})`;

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
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Expense Category *
          </label>
          <select
            value={category}
            onChange={(e) => {
              const c = normalizeExpenseCategory(e.target.value);
              setCategory(c);
              setDetails(emptyCategoryDetails(c, fuelType));
              setAmount('');
              if (!getCategoryMeta(c).showOdometer) setOdometerKm('');
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          >
            {EXPENSE_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {c === 'FUEL' && isElectricFuelType(fuelType)
                  ? 'Fuel / Charging'
                  : expenseCategoryLabel(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Vehicle *</label>
          <VehicleSelect
            vehicles={vehicles}
            value={vehicleId}
            onChange={handleVehicleChange}
            loading={vehiclesLoading}
          />
          {selectedVehicle?.fuelType ? (
            <p className="mt-1.5 text-xs text-slate-500">
              Fuel type:{' '}
              <span className="font-semibold text-slate-700">
                {selectedVehicle.fuelType}
              </span>
              {isElectric
                ? ' — electric charging form shown'
                : isCng
                  ? ' — CNG measured in kg'
                  : null}
            </p>
          ) : null}
        </div>

        {meta.showOdometer && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Odometer Reading (km) *
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={odometerKm}
              onChange={(e) =>
                setOdometerKm(formatGroupedNumber(e.target.value))
              }
              placeholder="e.g. 45,500"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
        )}

        {!autoAmount && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {amountFieldLabel(category, fuelType)} *
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) =>
                setAmount(
                  formatGroupedNumber(e.target.value, { allowDecimal: true }),
                )
              }
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

      <div
        className={`rounded-lg border p-3 ${
          isElectric
            ? 'border-emerald-100 bg-emerald-50/60'
            : 'border-slate-100 bg-slate-50'
        }`}
      >
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {isElectric ? <Zap className="h-3.5 w-3.5 text-emerald-600" /> : null}
          {sectionTitle}
        </p>
        {isFuel && !vehicleId ? (
          <p className="mb-3 text-xs text-amber-700">
            Select a vehicle first. The form switches between petrol/diesel (litres),
            CNG (kg), and electric (kWh) based on fuel type.
          </p>
        ) : null}
        {isElectric ? (
          <p className="mb-3 text-xs text-slate-600">
            Enter <strong>Energy Needed</strong>, <strong>Electricity Rate</strong>, and{' '}
            <strong>Charging Efficiency</strong>. Petrol/Diesel fields are hidden.
            Total Cost updates automatically.
          </p>
        ) : isFuel ? (
          <p className="mb-3 text-xs text-slate-500">
            Enter <strong>{fuelUnit.rateLabel}</strong> and{' '}
            <strong>{fuelUnit.quantityLabel}</strong>. Total Amount updates
            automatically (decimals supported).
          </p>
        ) : null}
        <ExpenseCategoryFields
          category={category}
          details={details}
          setDetails={setDetails}
          fuelType={fuelType}
        />
        {isElectric && electricPreview ? (
          <p className="mt-3 text-xs text-slate-600">
            {electricPreview.energy != null &&
            electricPreview.rate != null &&
            electricPreview.efficiency != null &&
            electricPreview.energy > 0 &&
            electricPreview.rate > 0 &&
            electricPreview.efficiency > 0 ? (
              <>
                Calculation:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {electricPreview.energy} kWh × {formatInr(electricPreview.rate)} ×{' '}
                  {electricPreview.efficiency} = {formatInr(electricPreview.total)}
                </span>
              </>
            ) : (
              <>Total Cost = Energy × Electricity Rate × Efficiency</>
            )}
          </p>
        ) : null}
        {fuelPreview ? (
          <p className="mt-3 text-xs text-slate-500">
            {fuelPreview.cost != null &&
            fuelPreview.quantity != null &&
            fuelPreview.cost > 0 &&
            fuelPreview.quantity > 0 ? (
              <>
                Calculation:{' '}
                <span className="font-mono font-semibold text-slate-700">
                  {formatInr(fuelPreview.cost)} × {fuelPreview.quantity}{' '}
                  {fuelUnit.short} = {formatInr(fuelPreview.total)}
                </span>
              </>
            ) : (
              <>Total Amount = {fuelUnit.formula}</>
            )}
          </p>
        ) : null}
      </div>

      {autoAmount && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {amountFieldLabel(category, fuelType)} *
          </label>
          <input
            type="text"
            inputMode="decimal"
            readOnly
            required
            value={amount}
            placeholder={
              isElectric
                ? 'Auto: Energy × Electricity Rate × Efficiency'
                : isFuel
                  ? `Auto: ${fuelUnit.formula}`
                  : 'Calculated from fields above'
            }
            aria-readonly="true"
            className="w-full cursor-default rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-800"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            {isElectric
              ? 'Read-only. Calculated live from Energy × Electricity Rate × Efficiency.'
              : isFuel
                ? `Read-only. Calculated live as you type ${fuelUnit.rateLabel} and ${fuelUnit.quantityLabel}.`
                : 'Read-only. Calculated automatically from the fields above.'}
          </p>
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
