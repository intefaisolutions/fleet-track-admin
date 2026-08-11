import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Info,
  Search,
} from 'lucide-react';
import { CompanyDriverDetailModal } from '../../components/company/CompanyDriverDetailModal';
import { ASSETS } from '../../config/assets';
import {
  driversService,
  type DriverRecord,
} from '../../services/drivers.service';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';
import { getApiErrorMessage } from '../../utils/validation';
import { downloadStyledExcel } from '../../utils/exportStyledExcel';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_TRIP', label: 'On Trip' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
] as const;

function driverEmail(d: DriverRecord): string {
  if (d.email) return d.email;
  const u = d.userId;
  if (u && typeof u === 'object' && u.email) return u.email;
  return '';
}

function assignedDriverId(
  ref?: VehicleRecord['assignedDriverId'],
): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
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

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles =
    s === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'ON_TRIP'
        ? 'bg-sky-100 text-sky-800'
        : s === 'SUSPENDED'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-600';

  const label =
    s === 'ACTIVE'
      ? 'Active'
      : s === 'ON_TRIP'
        ? 'On Trip'
        : s === 'SUSPENDED'
          ? 'Suspended'
          : s === 'INACTIVE'
            ? 'Inactive'
            : status;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

function formatAssignedVehicle(
  vehicles: VehicleRecord[],
): string {
  if (vehicles.length === 0) return 'Unassigned';
  if (vehicles.length === 1) {
    return vehicles[0].registrationNumber;
  }
  return `${vehicles[0].registrationNumber} +${vehicles.length - 1}`;
}

async function exportDriversExcel(
  rows: DriverRecord[],
  vehiclesByDriver: Map<string, VehicleRecord[]>,
  companyName: string,
  exportedBy?: string,
) {
  await downloadStyledExcel({
    companyName,
    title: 'Drivers Export',
    sheetName: 'Drivers',
    filename: `FleetTrack_Drivers_${companyName.replace(/\s+/g, '_')}`,
    exportedBy,
    columns: [
      { header: 'Full Name', key: 'fullName', width: 28 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'License', key: 'license', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Assigned Vehicle', key: 'vehicle', width: 32 },
    ],
    rows: rows.map((d) => {
      const assigned = vehiclesByDriver.get(d._id) ?? [];
      return {
        fullName: d.fullName,
        phone: d.phone,
        email: driverEmail(d),
        license: d.licenseNumber ?? '',
        status: d.status,
        vehicle:
          assigned.map((v) => v.registrationNumber).join('; ') || 'Unassigned',
      };
    }),
  });
}

export function CompanyDriversPage() {
  const { user } = useAuth();
  const ctx = useOutletContext<{ companyName?: string } | undefined>();
  const companyName = ctx?.companyName ?? 'Your Company';

  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState<
    'all' | 'assigned' | 'unassigned'
  >('all');
  const [page, setPage] = useState(1);
  const [detailDriver, setDetailDriver] = useState<DriverRecord | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([driversService.list(), vehiclesService.list()])
      .then(([driversRes, vehiclesRes]) => {
        if (driversRes.status === 'fulfilled') {
          setDrivers(driversRes.value.data ?? []);
        } else {
          setDrivers([]);
          toast.error(
            getApiErrorMessage(driversRes.reason, 'Failed to load drivers'),
          );
        }
        if (vehiclesRes.status === 'fulfilled') {
          setVehicles(vehiclesRes.value.data ?? []);
        } else {
          setVehicles([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const vehiclesByDriver = useMemo(() => {
    const map = new Map<string, VehicleRecord[]>();
    vehicles.forEach((v) => {
      const id = assignedDriverId(v.assignedDriverId);
      if (!id) return;
      const list = map.get(id) ?? [];
      list.push(v);
      map.set(id, list);
    });
    return map;
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drivers.filter((d) => {
      if (
        statusFilter !== 'all' &&
        d.status.toUpperCase() !== statusFilter.toUpperCase()
      ) {
        return false;
      }

      const assigned = vehiclesByDriver.get(d._id) ?? [];
      if (assignmentFilter === 'assigned' && assigned.length === 0) return false;
      if (assignmentFilter === 'unassigned' && assigned.length > 0) return false;

      if (!q) return true;
      const email = driverEmail(d).toLowerCase();
      const vehicleText = assigned
        .map((v) =>
          `${v.registrationNumber} ${v.make ?? ''} ${v.modelName ?? ''}`.toLowerCase(),
        )
        .join(' ');
      return (
        d.fullName.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        email.includes(q) ||
        (d.licenseNumber ?? '').toLowerCase().includes(q) ||
        vehicleText.includes(q)
      );
    });
  }, [drivers, search, statusFilter, assignmentFilter, vehiclesByDriver]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, assignmentFilter]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 shadow-sm">
        <div className="relative z-10 flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:py-10 md:pl-8 md:pr-4">
          <div className="max-w-lg shrink-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              All Drivers
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-base">
              View-only driver list for {companyName}. Search, filter, and review
              assignments without making changes.
            </p>
            <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Company Admin: View Only
            </div>
          </div>
          <img
            src={ASSETS.mascotDriver}
            alt=""
            className="pointer-events-none mx-auto h-28 w-auto max-w-full object-contain object-right md:absolute md:right-4 md:top-1/2 md:mx-0 md:h-36 md:max-w-[45%] md:-translate-y-1/2"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Search Driver
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, license, vehicle"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Driver Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-fleet-500"
              >
                {STATUS_FILTERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Assignment
              </label>
              <select
                value={assignmentFilter}
                onChange={(e) =>
                  setAssignmentFilter(
                    e.target.value as 'all' | 'assigned' | 'unassigned',
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-fleet-500"
              >
                <option value="all">All Drivers</option>
                <option value="assigned">Assigned Vehicle</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void exportDriversExcel(
                filtered,
                vehiclesByDriver,
                companyName,
                user?.fullName,
              ).catch(() => toast.error('Failed to export Excel'));
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-fleet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600 lg:mb-0.5"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Driver</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">License</th>
                <th className="px-5 py-3.5">Assigned Vehicle</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-slate-400"
                  >
                    Loading drivers...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14">
                    <div className="flex flex-col items-center justify-center text-center">
                      <img
                        src={ASSETS.mascotDriver}
                        alt=""
                        className="mb-4 h-24 w-auto opacity-80"
                      />
                      <p className="font-semibold text-slate-700">
                        No drivers found
                      </p>
                      <p className="mt-1 max-w-md text-sm text-slate-500">
                        Drivers added for {companyName} will appear here for
                        view-only management.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((d) => {
                  const assigned = vehiclesByDriver.get(d._id) ?? [];
                  const email = driverEmail(d);
                  return (
                    <tr
                      key={d._id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                            {driverInitials(d.fullName)}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {d.fullName}
                            </p>
                            {email ? (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {email}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {d.phone || '—'}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {d.licenseNumber || '—'}
                      </td>
                      <td className="px-5 py-4">
                        {assigned.length > 0 ? (
                          <div>
                            <p className="font-semibold text-slate-800">
                              {formatAssignedVehicle(assigned)}
                            </p>
                            {assigned[0].modelName || assigned[0].make ? (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {[assigned[0].make, assigned[0].modelName]
                                  .filter(Boolean)
                                  .join(' ')}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400">
                            <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setDetailDriver(d)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
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
              ? '0 drivers'
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} drivers`}
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

      <CompanyDriverDetailModal
        driver={detailDriver}
        vehicles={vehicles}
        onClose={() => setDetailDriver(null)}
      />
    </div>
  );
}
