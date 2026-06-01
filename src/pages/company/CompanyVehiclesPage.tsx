import { useMemo, useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Truck,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';

const PAGE_SIZE = 5;

function refName(
  ref?: { fullName?: string } | string | null,
  fallback = '—',
): string {
  if (!ref) return fallback;
  if (typeof ref === 'object' && ref.fullName) return ref.fullName;
  return fallback;
}

function driverInitial(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase();
}

function formatOdometer(km?: number) {
  if (km == null) return '—';
  return `${km.toLocaleString('en-IN')} km`;
}

function vehicleTypeLabel(type?: string) {
  if (!type) return 'Vehicle';
  return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles =
    s === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'MAINTENANCE'
        ? 'bg-amber-100 text-amber-800'
        : s === 'INACTIVE'
          ? 'bg-slate-100 text-slate-600'
          : 'bg-slate-100 text-slate-600';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {s === 'ACTIVE' ? 'Active' : s === 'MAINTENANCE' ? 'Maintenance' : s === 'INACTIVE' ? 'Inactive' : status}
    </span>
  );
}

function exportCsv(rows: VehicleRecord[]) {
  const header = [
    'Registration No',
    'Make',
    'Model',
    'Fuel',
    'Owner',
    'Driver',
    'Status',
    'Odometer',
  ];
  const lines = rows.map((v) =>
    [
      v.registrationNumber,
      v.make,
      v.modelName,
      v.fuelType ?? '',
      refName(v.ownerId, 'Unassigned'),
      refName(v.assignedDriverId, 'Unassigned'),
      v.status,
      v.currentOdometerKm ?? '',
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vehicles_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function CompanyVehiclesPage() {
  const ctx = useOutletContext<{ companyName?: string } | undefined>();
  const companyName = ctx?.companyName ?? 'Your Company';

  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

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

  const owners = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      const name = refName(v.ownerId, '');
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      const owner = refName(v.ownerId, 'Unassigned');
      if (ownerFilter !== 'all' && owner !== ownerFilter) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (!q) return true;
      return (
        v.registrationNumber.toLowerCase().includes(q) ||
        v.modelName.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q)
      );
    });
  }, [vehicles, search, ownerFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, ownerFilter, statusFilter]);

  const activeCount = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const activePct =
    vehicles.length > 0 ? Math.round((activeCount / vehicles.length) * 100) : 0;

  const inspectionAlerts = useMemo(() => {
    const now = Date.now();
    return vehicles
      .filter((v) => v.pucExpiry || v.insuranceExpiry)
      .map((v) => {
        const expiry = new Date(v.pucExpiry ?? v.insuranceExpiry ?? '').getTime();
        const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return {
          reg: v.registrationNumber,
          label: v.pucExpiry ? 'PUC renewal' : 'Insurance renewal',
          days,
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 2);
  }, [vehicles]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 to-fleet-600 px-6 py-8 text-white shadow-sm">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              FleetTrack
            </p>
            <div className="mt-2 flex gap-2 opacity-90">
              <Truck className="h-10 w-10" strokeWidth={1.25} />
              <Truck className="h-8 w-8 translate-y-2" strokeWidth={1.25} />
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          aria-hidden
          style={{
            backgroundImage:
              'repeating-linear-gradient(-12deg, transparent, transparent 40px, rgba(255,255,255,.08) 40px, rgba(255,255,255,.08) 80px)',
          }}
        />
      </div>

      {/* Title + filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Vehicles</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time status overview of the entire {companyName} fleet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reg No. or Model"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
          />
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
        >
          <option value="all">All Owners</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Registration No.</th>
                <th className="px-5 py-3">Model &amp; Type</th>
                <th className="px-5 py-3">Fuel</th>
                <th className="px-5 py-3">Owner Name</th>
                <th className="px-5 py-3">Assigned Driver</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Odometer</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    Loading vehicles...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No vehicles found. Vehicle owners add vehicles from their panel.
                  </td>
                </tr>
              ) : (
                pageRows.map((v) => {
                  const driver = refName(v.assignedDriverId, '');
                  const owner = refName(v.ownerId, '—');
                  return (
                    <tr
                      key={v._id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-fleet-600">
                          {v.registrationNumber}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {v.make} {v.modelName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {vehicleTypeLabel(v.vehicleType)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {v.fuelType ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{owner}</td>
                      <td className="px-5 py-4">
                        {driver ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                              {driverInitial(driver)}
                            </span>
                            <span className="text-slate-700">{driver}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {formatOdometer(v.currentOdometerKm)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toast.info('Vehicle details — coming soon')}
                          className="text-sm font-medium text-fleet-600 hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {filtered.length === 0
              ? '0 vehicles'
              : `${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} vehicles`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[2rem] rounded-lg px-2 py-1 text-sm font-medium ${
                    p === page
                      ? 'bg-fleet-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom widgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Operational Fleet</p>
              <p className="mt-2 text-4xl font-bold text-slate-900">{activePct}%</p>
              <p className="mt-2 text-sm text-slate-600">
                {activeCount} of {vehicles.length} vehicles are currently active on active
                routes.
              </p>
            </div>
            <div className="rounded-full bg-fleet-50 p-3">
              <Truck className="h-6 w-6 text-fleet-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Upcoming Inspections</p>
            <button type="button" className="text-sm font-medium text-fleet-600 hover:underline">
              View Schedule
            </button>
          </div>
          {inspectionAlerts.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming document renewals.</p>
          ) : (
            <ul className="space-y-3">
              {inspectionAlerts.map((a) => (
                <li key={a.reg} className="flex items-start gap-3">
                  {a.days < 0 ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.reg}</p>
                    <p className="text-xs text-slate-500">{a.label}</p>
                    <p
                      className={`text-xs font-semibold ${
                        a.days < 0 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {a.days < 0
                        ? `Overdue by ${Math.abs(a.days)} days`
                        : `Due in ${a.days} days`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
