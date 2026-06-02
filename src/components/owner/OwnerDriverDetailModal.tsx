import { Phone, Mail, CreditCard, User, X } from 'lucide-react';
import type { DriverRecord } from '../../services/drivers.service';
import type { VehicleRecord } from '../../services/vehicles.service';

function driverEmail(d: DriverRecord): string {
  if (d.email) return d.email;
  const u = d.userId;
  if (u && typeof u === 'object' && u.email) return u.email;
  return '—';
}

function driverId(ref?: VehicleRecord['assignedDriverId']): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

export function OwnerDriverDetailModal({
  driver,
  vehicles,
  onClose,
}: {
  driver: DriverRecord | null;
  vehicles: VehicleRecord[];
  onClose: () => void;
}) {
  if (!driver) return null;

  const assignedVehicles = vehicles.filter((v) => driverId(v.assignedDriverId) === driver._id);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Driver Details
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{driver.fullName}</h2>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                driver.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {driver.status === 'ACTIVE' ? 'Available' : driver.status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <User className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p className="font-semibold text-slate-900">{driver.fullName}</p>
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <Phone className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="font-semibold text-slate-900">{driver.phone || '—'}</p>
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
            <Mail className="h-4 w-4 text-fleet-500" />
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-semibold text-slate-900">{driverEmail(driver)}</p>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assigned Vehicles
          </p>
          {assignedVehicles.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">Not assigned to any vehicle</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {assignedVehicles.map((v) => (
                <li key={v._id} className="text-sm font-medium text-slate-800">
                  {v.registrationNumber}
                  {v.modelName ? ` · ${v.make ?? ''} ${v.modelName}`.trim() : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
