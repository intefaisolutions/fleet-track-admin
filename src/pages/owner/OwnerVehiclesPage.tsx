import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Truck, Wrench } from 'lucide-react';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';
import { AddOwnerVehicleDrawer } from '../../components/owner/AddOwnerVehicleDrawer';
import { getApiErrorMessage } from '../../utils/validation';

function refName(
  ref?: { fullName?: string } | string | null,
  fallback = 'Unassigned',
): string {
  if (!ref) return fallback;
  if (typeof ref === 'object' && ref.fullName) return ref.fullName;
  return fallback;
}

function formatOdometer(km?: number) {
  if (km == null) return '—';
  return `${km.toLocaleString('en-US')} km`;
}

function formatMaintenanceDate(date?: string) {
  if (!date) return 'TBD';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function modelLine(v: VehicleRecord) {
  const title = [v.make, v.modelName].filter(Boolean).join(' ').trim();
  return title || v.modelName || '—';
}

function VehicleCard({ vehicle }: { vehicle: VehicleRecord }) {
  const status = vehicle.status.toUpperCase();
  const isMaintenance = status === 'MAINTENANCE';
  const isActive = status === 'ACTIVE';

  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        isMaintenance
          ? 'border-l-4 border-l-amber-500 border-slate-200'
          : 'border-slate-200'
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            isMaintenance ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'
          }`}
        >
          {isMaintenance ? (
            <Wrench className="h-6 w-6" />
          ) : (
            <Truck className="h-6 w-6" />
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isActive
              ? 'bg-emerald-100 text-emerald-700'
              : isMaintenance
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isActive ? 'Active' : isMaintenance ? 'Maintenance' : status}
        </span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {vehicle.registrationNumber}
      </p>
      <h3 className="mt-1 text-base font-bold text-slate-900">{modelLine(vehicle)}</h3>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Driver</dt>
          <dd className="font-medium text-slate-800">
            {refName(vehicle.assignedDriverId)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">Odometer</dt>
          <dd className="font-medium text-slate-800">
            {formatOdometer(vehicle.currentOdometerKm)}
          </dd>
        </div>
      </dl>

      {isMaintenance && (
        <p className="mt-3 text-xs text-amber-700">
          Scheduled: {formatMaintenanceDate(vehicle.lastServiceDate)}
        </p>
      )}
    </article>
  );
}

export function OwnerVehiclesPage() {
  const { search = '' } = useOutletContext<{ search?: string }>();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    vehiclesService
      .list()
      .then((res) => setVehicles(res.data ?? []))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load vehicles')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        modelLine(v).toLowerCase().includes(q) ||
        refName(v.assignedDriverId, '').toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and monitor your fleet performance and assignments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-fleet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-slate-400">Loading vehicles...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Truck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-500">
            {search ? 'No vehicles match your search.' : 'No vehicles yet.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="mt-4 text-sm font-semibold text-fleet-600 hover:underline"
            >
              Add your first vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <VehicleCard key={v._id} vehicle={v} />
          ))}
        </div>
      )}

      <AddOwnerVehicleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
