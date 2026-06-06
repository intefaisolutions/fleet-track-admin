import { ChevronDown } from 'lucide-react';
import type { VehicleRecord } from '../../services/vehicles.service';

export function vehicleOptionLabel(v: VehicleRecord): string {
  const title = [v.make, v.modelName].filter(Boolean).join(' ').trim();
  const reg = v.registrationNumber ?? 'Vehicle';
  return title ? `${reg} — ${title}` : reg;
}

export function resolveVehicleId(v: VehicleRecord): string {
  return v._id ?? '';
}

export function VehicleSelect({
  vehicles,
  value,
  onChange,
  required = true,
  disabled = false,
  loading = false,
}: {
  vehicles: VehicleRecord[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isEmpty = vehicles.length === 0;

  return (
    <div>
      <div className="relative">
        <select
          required={required && !isEmpty}
          disabled={disabled || loading || isEmpty}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="" disabled>
            {loading
              ? 'Loading vehicles…'
              : isEmpty
                ? 'No vehicles available'
                : 'Select a vehicle…'}
          </option>
          {vehicles.map((v) => {
            const id = resolveVehicleId(v);
            if (!id) return null;
            return (
              <option key={id} value={id}>
                {vehicleOptionLabel(v)}
              </option>
            );
          })}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
      </div>
      {isEmpty && !loading && (
        <p className="mt-1.5 text-xs text-amber-700">
          No vehicles found. Add a vehicle under My Vehicles first.
        </p>
      )}
    </div>
  );
}
