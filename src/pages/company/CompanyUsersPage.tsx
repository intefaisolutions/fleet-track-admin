import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Truck,
  Users,
} from 'lucide-react';
import { ROLES, ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { usersService, type UserRecord } from '../../services/users.service';
import { vehiclesService } from '../../services/vehicles.service';
import { AddUserModal } from '../../components/company/AddUserModal';
import { getApiErrorMessage } from '../../utils/validation';

type Tab = 'owners' | 'drivers';

const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const active = s === 'ACTIVE';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {active ? 'Active' : s === 'SUSPENDED' ? 'Suspended' : status}
    </span>
  );
}

function exportCsv(rows: UserRecord[], tab: Tab, vehicleCounts: Record<string, number>) {
  const header =
    tab === 'owners'
      ? ['Full Name', 'Email', 'Phone', 'Vehicles', 'Status']
      : ['Full Name', 'Email', 'Phone', 'Status'];
  const lines = rows.map((u) =>
    (tab === 'owners'
      ? [u.fullName, u.email, u.phone, vehicleCounts[u._id] ?? 0, u.status]
      : [u.fullName, u.email, u.phone, u.status]
    )
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tab === 'owners' ? 'vehicle_owners.csv' : 'drivers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function CompanyUsersPage() {
  const ctx = useOutletContext<{ companyName?: string } | undefined>();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('owners');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([usersService.list(), vehiclesService.list()])
      .then(([usersRes, vehiclesRes]) => {
        setUsers(usersRes.data ?? []);
        const counts: Record<string, number> = {};
        (vehiclesRes.data ?? []).forEach((v) => {
          const owner = v.ownerId;
          const ownerId =
            typeof owner === 'object' && owner?._id
              ? owner._id
              : typeof owner === 'string'
                ? owner
                : null;
          if (ownerId) counts[ownerId] = (counts[ownerId] ?? 0) + 1;
        });
        setVehicleCounts(counts);
      })
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load users')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const owners = useMemo(
    () => users.filter((u) => u.role === ROLES.VEHICLE_OWNER),
    [users],
  );
  const drivers = useMemo(
    () => users.filter((u) => u.role === ROLES.DRIVER),
    [users],
  );

  const activeList = tab === 'owners' ? owners : drivers;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q),
    );
  }, [activeList, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const toggleSuspend = async (u: UserRecord) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await usersService.updateStatus(u._id, next);
      toast.success(next === 'SUSPENDED' ? 'User suspended' : 'User activated');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    } finally {
      setMenuOpenId(null);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        {/* Breadcrumb + header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              <Link to={ROUTES.COMPANY_DASHBOARD} className="hover:text-fleet-600">
                FleetTrack
              </Link>
              <span className="mx-1.5">›</span>
              <span className="text-slate-600">Users</span>
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Users Management</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Efficiently manage your fleet network. Handle vehicle owners and drivers profile,
              monitor their activity status, and manage access permissions from a single
              interface.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Support
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          </div>
        </div>

        {/* Tabs + tools */}
        <div className="flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setTab('owners')}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                tab === 'owners'
                  ? 'border-fleet-500 text-fleet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Vehicle Owners
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {owners.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('drivers')}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                tab === 'drivers'
                  ? 'border-fleet-500 text-fleet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Drivers
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {drivers.length}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 pb-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Filter"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => exportCsv(filtered, tab, vehicleCounts)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              aria-label="Export"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users, IDs, or vehicles..."
          className="w-full max-w-md rounded-lg border border-slate-200 px-4 py-2 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
        />

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  {tab === 'owners' && <th className="px-5 py-3">Vehicles</th>}
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tab === 'owners' ? 6 : 5} className="px-5 py-12 text-center text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={tab === 'owners' ? 6 : 5} className="px-5 py-12 text-center text-slate-400">
                      No {tab === 'owners' ? 'vehicle owners' : 'drivers'} yet. Click Add New to
                      create one.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u) => (
                    <tr
                      key={u._id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fleet-100 text-xs font-bold text-fleet-700">
                            {initials(u.fullName)}
                          </span>
                          <span className="font-medium text-slate-900">{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{u.email}</td>
                      <td className="px-5 py-4 text-slate-600">{u.phone}</td>
                      {tab === 'owners' && (
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {String(vehicleCounts[u._id] ?? 0).padStart(2, '0')}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="relative px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpenId(menuOpenId === u._id ? null : u._id)
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                        {menuOpenId === u._id && (
                          <div className="absolute right-5 top-12 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => toggleSuspend(u)}
                              className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {filtered.length === 0
                ? '0 users'
                : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} users`}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-8 rounded-lg px-2 py-1.5 text-sm font-medium ${
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
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side illustration */}
      <div
        className="hidden w-56 shrink-0 xl:block"
        aria-hidden
      >
        <div className="sticky top-24 rounded-2xl bg-gradient-to-br from-sky-50 to-fleet-50 p-6">
          <div className="flex justify-center gap-1">
            {[Users, Truck, Users].map((Icon, i) => (
              <div
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm"
              >
                <Icon className="h-5 w-5 text-fleet-500" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Truck className="h-5 w-5 text-fleet-600" />
            <span className="text-sm font-bold tracking-wide text-fleet-700">FLEETTRACK</span>
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            {ctx?.companyName ?? 'Your fleet team'}
          </p>
        </div>
      </div>

      <AddUserModal
        open={modalOpen}
        tab={tab}
        companyId={user?.companyId}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
