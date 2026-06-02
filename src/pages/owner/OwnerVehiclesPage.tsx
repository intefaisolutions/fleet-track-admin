import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Eye,
  Info,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';
import {
  subscriptionsService,
  type SubscriptionRecord,
} from '../../services/subscriptions.service';
import { ROUTES } from '../../config/constants';
import { OwnerVehicleFormDrawer } from '../../components/owner/OwnerVehicleFormDrawer';
import { OwnerVehicleDetailModal } from '../../components/owner/OwnerVehicleDetailModal';
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
  return `${km.toLocaleString('en-IN')} km`;
}

function modelLine(v: VehicleRecord) {
  const title = [v.make, v.modelName].filter(Boolean).join(' ').trim();
  return title || v.modelName || '—';
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

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles =
    s === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'MAINTENANCE'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-600';
  const label =
    s === 'ACTIVE'
      ? 'Active'
      : s === 'MAINTENANCE'
        ? 'Maintenance'
      : s === 'INACTIVE'
        ? 'Inactive'
        : s === 'RETIRED'
          ? 'Retired'
          : status;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

export function OwnerVehiclesPage() {
  const navigate = useNavigate();
  const { search = '' } = useOutletContext<{ search?: string }>();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<VehicleRecord | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<VehicleRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([vehiclesService.list(), subscriptionsService.list()])
      .then(([vehRes, subRes]) => {
        if (vehRes.status === 'fulfilled') {
          setVehicles(vehRes.value.data ?? []);
        } else {
          setVehicles([]);
          toast.error(getApiErrorMessage(vehRes.reason, 'Failed to load vehicles'));
        }
        if (subRes.status === 'fulfilled') {
          const subs = subRes.value.data ?? [];
          setSubscription(
            subs.find((s) => s.status === 'ACTIVE') ?? subs[0] ?? null,
          );
        } else {
          setSubscription(null);
        }
      })
      .catch((err: unknown) => {
        setVehicles([]);
        setSubscription(null);
        toast.error(getApiErrorMessage(err, 'Failed to load vehicles'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const limit = subscription?.vehicleLimit ?? 5;
  const used = vehicles.length;
  const remaining = Math.max(0, limit - used);
  const atLimit = remaining <= 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        modelLine(v).toLowerCase().includes(q) ||
        refName(v.assignedDriverId, '').toLowerCase().includes(q) ||
        typeLabel(v.vehicleType).toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  const openAdd = () => {
    if (atLimit) {
      toast.warning(`Vehicle limit reached (${used}/${limit}). Upgrade your plan to add more.`);
      return;
    }
    setEditVehicle(null);
    setDrawerOpen(true);
  };

  const openEdit = (v: VehicleRecord) => {
    setEditVehicle(v);
    setDrawerOpen(true);
  };

  const handleDelete = async (v: VehicleRecord) => {
    const label = `${v.registrationNumber} (${modelLine(v)})`;
    if (
      !window.confirm(
        `Delete ${label}? This cannot be undone (e.g. vehicle sold or decommissioned).`,
      )
    ) {
      return;
    }
    setDeletingId(v._id);
    try {
      await vehiclesService.remove(v._id);
      toast.success('Vehicle deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete vehicle'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add, edit, view, and delete your registered vehicles. Limit depends on your plan.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={atLimit}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-fleet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </button>
      </div>

      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          atLimit
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-sky-200 bg-sky-50 text-sky-900'
        }`}
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">
            {used}/{limit} vehicles used
            {remaining > 0
              ? ` – you can add ${remaining} more`
              : ' – limit reached'}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            {subscription?.planType ?? 'Plan'} subscription
          </p>
          {atLimit && (
            <button
              type="button"
              onClick={() => navigate(ROUTES.OWNER_UPGRADE)}
              className="mt-2 inline-flex rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Upgrade Plan
            </button>
          )}
        </div>
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
              onClick={openAdd}
              className="mt-4 text-sm font-semibold text-fleet-600 hover:underline"
            >
              Register your first vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Fuel</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Odometer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {v.registrationNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{modelLine(v)}</td>
                    <td className="px-4 py-3 text-slate-600">{typeLabel(v.vehicleType)}</td>
                    <td className="px-4 py-3 text-slate-600">{v.fuelType ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {refName(v.assignedDriverId)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatOdometer(v.currentOdometerKm)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => setDetailVehicle(v)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-fleet-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit vehicle"
                          onClick={() => openEdit(v)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-fleet-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete vehicle"
                          disabled={deletingId === v._id}
                          onClick={() => handleDelete(v)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OwnerVehicleFormDrawer
        open={drawerOpen}
        vehicle={editVehicle}
        onClose={() => {
          setDrawerOpen(false);
          setEditVehicle(null);
        }}
        onSuccess={load}
      />

      <OwnerVehicleDetailModal
        vehicle={detailVehicle}
        onClose={() => setDetailVehicle(null)}
      />
    </div>
  );
}
