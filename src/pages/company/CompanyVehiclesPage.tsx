import { useMemo, useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Search,
} from 'lucide-react';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';
import { ASSETS } from '../../config/assets';
import { getApiErrorMessage } from '../../utils/validation';

const PAGE_SIZE = 10;

function refName(
  ref?: { fullName?: string } | string | null,
  fallback = '—',
): string {
  if (!ref) return fallback;
  if (typeof ref === 'object' && ref.fullName) return ref.fullName;
  return fallback;
}

function driverInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function shortDriverName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function formatOdometer(km?: number) {
  if (km == null) return '—';
  return `${km.toLocaleString('en-IN')} km`;
}

function vehicleTypeLabel(type?: string) {
  if (!type) return 'Vehicle';
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function modelLine(v: VehicleRecord) {
  const title = [v.make, v.modelName].filter(Boolean).join(' ').trim();
  return title || v.modelName || '—';
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
    s === 'ACTIVE' ? 'Active' : s === 'MAINTENANCE' ? 'Maintenance' : s === 'INACTIVE' ? 'Inactive' : status;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
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

  return (
    <div className="space-y-5">
      {/* Hero — title + fleet illustration (Figma) */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 shadow-sm">
        <div className="relative z-10 flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:py-10 md:pl-8 md:pr-4">
          <div className="max-w-lg shrink-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              All Vehicles
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-base">
              Real-time status overview of the entire {companyName} fleet.
            </p>
          </div>
          <img
            src={ASSETS.vehiclesFleetHero}
            alt=""
            className="pointer-events-none mx-auto h-28 w-auto max-w-full object-contain object-right md:absolute md:right-4 md:top-1/2 md:mx-0 md:h-36 md:max-w-[55%] md:-translate-y-1/2"
          />
        </div>
      </section>

      {/* Filters + Export */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Reg No. or Model"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Owner
              </label>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-fleet-500"
              >
                <option value="all">All Owners</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-fleet-500"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-fleet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600 lg:mb-0.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Registration No.</th>
                <th className="px-5 py-3.5">Model &amp; Type</th>
                <th className="px-5 py-3.5">Fuel</th>
                <th className="px-5 py-3.5">Owner Name</th>
                <th className="px-5 py-3.5">Assigned Driver</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Odometer</th>
                <th className="px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                    Loading vehicles...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src={ASSETS.vehiclesFleetHero}
                        alt=""
                        className="mb-4 h-24 w-auto opacity-80"
                      />
                      <p className="font-semibold text-slate-700">No vehicles found</p>
                      <p className="mt-1 max-w-md text-sm text-slate-500">
                        Vehicle owners add vehicles from their panel. They will appear here
                        for {companyName}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((v) => {
                  const driverFull = refName(v.assignedDriverId, '');
                  const owner = refName(v.ownerId, '—');
                  return (
                    <tr
                      key={v._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toast.info('Vehicle details — coming soon')}
                          className="font-semibold text-fleet-600 hover:underline"
                        >
                          {v.registrationNumber}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{modelLine(v)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {vehicleTypeLabel(v.vehicleType)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{v.fuelType ?? '—'}</td>
                      <td className="px-5 py-4 font-medium text-slate-800">{owner}</td>
                      <td className="px-5 py-4">
                        {driverFull ? (
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                              {driverInitials(driverFull)}
                            </span>
                            <span className="text-slate-800">
                              {shortDriverName(driverFull)}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400">
                            <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatOdometer(v.currentOdometerKm)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toast.info('Vehicle details — coming soon')}
                          className="text-sm font-semibold text-fleet-600 hover:underline"
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

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {filtered.length === 0
              ? '0 vehicles'
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} vehicles`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Previous page"
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
                  className={`min-w-8 rounded-lg px-2.5 py-1 text-sm font-medium ${
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
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
