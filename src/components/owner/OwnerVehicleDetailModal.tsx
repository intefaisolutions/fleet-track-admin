import { useEffect, useMemo, useState } from 'react';
import { FileText, Receipt, X } from 'lucide-react';
import { expensesService, type ExpenseRecord } from '../../services/expenses.service';
import type { VehicleRecord } from '../../services/vehicles.service';

function refName(
  ref?: { fullName?: string } | string | null,
  fallback = '—',
): string {
  if (!ref) return fallback;
  if (typeof ref === 'object' && ref.fullName) return ref.fullName;
  return fallback;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatInr(n?: number) {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function vehicleIdFromExpense(exp: ExpenseRecord): string {
  const v = exp.vehicleId;
  if (!v) return '';
  if (typeof v === 'string') return v;
  return v._id ?? '';
}

function typeLabel(type?: string) {
  const map: Record<string, string> = {
    TRUCK: 'Truck',
    VAN: 'Van',
    CAR: 'Car',
    BIKE: 'Auto',
    OTHER: 'Other',
  };
  return type ? (map[type] ?? type) : '—';
}

export function OwnerVehicleDetailModal({
  vehicle,
  onClose,
}: {
  vehicle: VehicleRecord | null;
  onClose: () => void;
}) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    setLoadingExpenses(true);
    expensesService
      .list()
      .then((res) => {
        const all = res.data ?? [];
        setExpenses(
          all
            .filter((e) => vehicleIdFromExpense(e) === vehicle._id)
            .sort((a, b) => {
              const da = new Date(a.expenseDate ?? 0).getTime();
              const db = new Date(b.expenseDate ?? 0).getTime();
              return db - da;
            }),
        );
      })
      .catch(() => setExpenses([]))
      .finally(() => setLoadingExpenses(false));
  }, [vehicle]);

  const expenseTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0),
    [expenses],
  );

  if (!vehicle) return null;

  const modelTitle = [vehicle.make, vehicle.modelName].filter(Boolean).join(' ').trim();

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="fixed inset-4 z-50 mx-auto flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Vehicle Details
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {vehicle.registrationNumber}
            </h2>
            <p className="text-sm text-slate-500">{modelTitle || vehicle.modelName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {vehicle.imageUrl && (
            <img
              src={vehicle.imageUrl}
              alt=""
              className="mb-5 h-40 w-full rounded-xl object-cover"
            />
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ['Model', modelTitle || '—'],
              ['Year', vehicle.year ?? '—'],
              ['Type', typeLabel(vehicle.vehicleType)],
              ['Fuel', vehicle.fuelType ?? '—'],
              ['Odometer', `${(vehicle.currentOdometerKm ?? 0).toLocaleString('en-IN')} km`],
              ['Status', vehicle.status],
              ['Purchase Date', formatDate(vehicle.purchaseDate)],
              ['Purchase Cost', formatInr(vehicle.purchaseCost)],
              ['Assigned Driver', refName(vehicle.assignedDriverId, 'Unassigned')],
              ['Insurance Expiry', formatDate(vehicle.insuranceExpiry)],
              ['PUC Expiry', formatDate(vehicle.pucExpiry)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Receipt className="h-4 w-4 text-fleet-500" />
                Expense History
              </h3>
              <span className="text-sm font-semibold text-slate-600">
                Total: {formatInr(expenseTotal)}
              </span>
            </div>
            {loadingExpenses ? (
              <p className="text-sm text-slate-400">Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                No expenses recorded for this vehicle yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {expenses.slice(0, 10).map((e) => (
                  <li
                    key={e._id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{e.category}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(e.expenseDate)}
                        {e.description ? ` · ${e.description}` : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatInr(e.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="h-4 w-4 text-fleet-500" />
              Documents
            </h3>
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              RC, insurance, and PUC documents can be uploaded here in a future update.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
