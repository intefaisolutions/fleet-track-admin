import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Link2, X } from 'lucide-react';
import type { DriverRecord } from '../../services/drivers.service';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

function driverId(ref?: VehicleRecord['assignedDriverId']): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

function driverName(ref?: VehicleRecord['assignedDriverId']): string {
  if (!ref) return '';
  if (typeof ref === 'object' && ref.fullName) return ref.fullName;
  return '';
}

export function OwnerAssignDriverModal({
  open,
  mode,
  drivers,
  vehicles,
  initialDriverId,
  initialVehicleId,
  onClose,
  onSuccess,
  demoMode,
}: {
  open: boolean;
  mode: 'assign' | 'change';
  drivers: DriverRecord[];
  vehicles: VehicleRecord[];
  initialDriverId?: string;
  initialVehicleId?: string;
  onClose: () => void;
  onSuccess: (vehicleId: string, driverId: string) => void;
  demoMode?: boolean;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverIdValue, setDriverIdValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVehicleId(initialVehicleId ?? '');
    setDriverIdValue(initialDriverId ?? '');
  }, [open, initialDriverId, initialVehicleId]);

  if (!open) return null;

  const selectedVehicle = vehicles.find((v) => v._id === vehicleId);
  const currentDriverOnVehicle = selectedVehicle
    ? driverId(selectedVehicle.assignedDriverId)
    : '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverIdValue) {
      toast.error('Select both vehicle and driver');
      return;
    }
    if (driverIdValue === currentDriverOnVehicle) {
      toast.info('This driver is already assigned to the selected vehicle');
      return;
    }

    if (demoMode) {
      toast.success(
        mode === 'change'
          ? 'Driver changed (demo)'
          : 'Driver assigned to vehicle (demo)',
      );
      onSuccess(vehicleId, driverIdValue);
      onClose();
      return;
    }

    setLoading(true);
    try {
      await vehiclesService.update(vehicleId, { assignedDriverId: driverIdValue });
      toast.success(
        mode === 'change' ? 'Driver changed successfully' : 'Driver assigned to vehicle',
      );
      onSuccess(vehicleId, driverIdValue);
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Assignment failed'));
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'change' ? 'Change Driver' : 'Assign Driver to Vehicle';
  const subtitle =
    mode === 'change'
      ? 'Reassign this vehicle to a different driver from your company list.'
      : 'Link a driver created by Company Admin to one of your vehicles.';

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Vehicle *
            </label>
            <select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={Boolean(initialVehicleId) && mode === 'change'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 disabled:bg-slate-50"
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber}
                  {v.modelName ? ` — ${v.make ?? ''} ${v.modelName}`.trim() : ''}
                  {driverName(v.assignedDriverId)
                    ? ` (current: ${driverName(v.assignedDriverId)})`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Driver *
            </label>
            <select
              required
              value={driverIdValue}
              onChange={(e) => setDriverIdValue(e.target.value)}
              disabled={Boolean(initialDriverId) && mode === 'assign' && Boolean(initialVehicleId)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 disabled:bg-slate-50"
            >
              <option value="">Select driver...</option>
              {drivers
                .filter((d) => d.status === 'ACTIVE' || d.status === 'active')
                .map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.fullName}
                  </option>
                ))}
            </select>
          </div>

          {selectedVehicle && currentDriverOnVehicle && mode === 'change' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Current driver: {driverName(selectedVehicle.assignedDriverId) || 'Assigned'}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" />
            {loading ? 'Saving...' : mode === 'change' ? 'Change Driver' : 'Assign Driver'}
          </button>
        </form>
      </div>
    </>
  );
}

