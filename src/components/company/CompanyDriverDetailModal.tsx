import {
  CreditCard,
  Mail,
  Phone,
  Truck,
  User,
  X,
} from 'lucide-react';
import type { DriverRecord } from '../../services/drivers.service';
import type { VehicleRecord } from '../../services/vehicles.service';

function driverEmail(d: DriverRecord): string {
  if (d.email?.trim()) return d.email.trim();
  const u = d.userId;
  if (u && typeof u === 'object' && u.email?.trim()) return u.email.trim();
  return '';
}

function assignedDriverId(
  ref?: VehicleRecord['assignedDriverId'],
): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

function statusStyles(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'bg-emerald-100 text-emerald-800';
  if (s === 'ON_TRIP') return 'bg-sky-100 text-sky-800';
  if (s === 'SUSPENDED') return 'bg-red-100 text-red-800';
  if (s === 'INACTIVE') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-600';
}

function statusLabel(status: string) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'Active';
  if (s === 'ON_TRIP') return 'On Trip';
  if (s === 'SUSPENDED') return 'Suspended';
  if (s === 'INACTIVE') return 'Inactive';
  return status;
}

export function CompanyDriverDetailModal({
  driver,
  vehicles,
  onClose,
}: {
  driver: DriverRecord | null;
  vehicles: VehicleRecord[];
  onClose: () => void;
}) {
  if (!driver) return null;

  const assignedVehicles = vehicles.filter(
    (v) => assignedDriverId(v.assignedDriverId) === driver._id,
  );

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-detail-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Driver Details
            </p>
            <h2
              id="driver-detail-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              {driver.fullName}
            </h2>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles(driver.status)}`}
            >
              {statusLabel(driver.status)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <User className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">Full Name</p>
              <p className="font-semibold text-slate-900">{driver.fullName}</p>
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <Phone className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="font-semibold text-slate-900">
                {driver.phone || '—'}
              </p>
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <Mail className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-semibold text-slate-900 break-all">
                {driverEmail(driver) || '—'}
              </p>
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <CreditCard className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">License Number</p>
              <p className="font-semibold text-slate-900">
                {driver.licenseNumber || '—'}
              </p>
            </div>
          </li>
        </ul>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Truck className="h-3.5 w-3.5" />
            Assigned Vehicle
          </p>
          {assignedVehicles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Not assigned to any vehicle</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {assignedVehicles.slice(0, 1).map((v) => (
                <li
                  key={v._id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-slate-800">
                    {v.registrationNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[v.make, v.modelName].filter(Boolean).join(' ') || 'Vehicle'}
                    {v.status ? ` · ${v.status}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          View only — one vehicle ↔ one driver. Vehicle Owners manage assignments.
        </p>
      </div>
    </>
  );
}
