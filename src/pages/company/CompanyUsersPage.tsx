import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  KeyRound,
  Headphones,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ROLES, ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { usersService, type UserRecord } from '../../services/users.service';
import { driversService, type DriverRecord } from '../../services/drivers.service';
import { vehiclesService } from '../../services/vehicles.service';
import { authService } from '../../services/auth.service';
import { AddUserModal } from '../../components/company/AddUserModal';
import { ActionMenuDropdown } from '../../components/ui/ActionMenuDropdown';
import { getApiErrorMessage } from '../../utils/validation';

type Tab = 'all' | 'owners' | 'drivers';
type CreateTab = 'owners' | 'drivers';

const PAGE_SIZE = 10;

function tableColCount(tab: Tab): number {
  if (tab === 'all') return 8;
  if (tab === 'owners') return 6;
  return 6;
}

function roleLabel(role: string): string {
  return role === ROLES.VEHICLE_OWNER ? 'Vehicle Owner' : 'Driver';
}

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

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === ROLES.VEHICLE_OWNER;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isOwner ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
      }`}
    >
      {isOwner ? 'Owner' : 'Driver'}
    </span>
  );
}

function driverUserId(driver: DriverRecord): string {
  const uid = driver.userId;
  if (!uid) return '';
  if (typeof uid === 'string') return uid;
  return uid._id ?? '';
}

function exportCsv(
  rows: UserRecord[],
  tab: Tab,
  vehicleCounts: Record<string, number>,
  driversByUserId: Record<string, DriverRecord>,
) {
  const header =
    tab === 'all'
      ? ['Full Name', 'Email', 'Phone', 'Role', 'Vehicles', 'License', 'Status']
      : tab === 'owners'
        ? ['Full Name', 'Email', 'Phone', 'Vehicles', 'Status']
        : ['Full Name', 'Email', 'Phone', 'License', 'Status'];

  const lines = rows.map((u) => {
    const license = driversByUserId[u._id]?.licenseNumber ?? '';
    const row =
      tab === 'all'
        ? [
            u.fullName,
            u.email,
            u.phone,
            roleLabel(u.role),
            u.role === ROLES.VEHICLE_OWNER ? vehicleCounts[u._id] ?? 0 : '',
            u.role === ROLES.DRIVER ? license : '',
            u.status,
          ]
        : tab === 'owners'
          ? [u.fullName, u.email, u.phone, vehicleCounts[u._id] ?? 0, u.status]
          : [u.fullName, u.email, u.phone, license, u.status];
    return row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
  });

  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    tab === 'all' ? 'all_users.csv' : tab === 'owners' ? 'vehicle_owners.csv' : 'drivers.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function CompanyUsersPage() {
  const { user } = useAuth();
  const ctx = useOutletContext<{ search?: string; setSearch?: (s: string) => void } | undefined>();
  const search = ctx?.search ?? '';
  const setSearch = ctx?.setSearch ?? (() => {});

  const [tab, setTab] = useState<Tab>('all');
  const [modalTab, setModalTab] = useState<CreateTab>('owners');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [driverRecords, setDriverRecords] = useState<DriverRecord[]>([]);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
  });
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([usersService.list(), vehiclesService.list(), driversService.list()])
      .then(([usersRes, vehiclesRes, driversRes]) => {
        const apiUsers = usersRes.data ?? [];
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
        setUsers(apiUsers);
        setVehicleCounts(counts);
        setDriverRecords(driversRes.data ?? []);
      })
      .catch((err: unknown) => {
        setUsers([]);
        setVehicleCounts({});
        setDriverRecords([]);
        toast.error(getApiErrorMessage(err, 'Failed to load users'));
      })
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

  const allUsers = useMemo(
    () =>
      [...owners, ...drivers].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }),
      ),
    [owners, drivers],
  );

  const driversByUserId = useMemo(() => {
    const map: Record<string, DriverRecord> = {};
    driverRecords.forEach((d) => {
      const uid = driverUserId(d);
      if (uid) map[uid] = d;
    });
    return map;
  }, [driverRecords]);

  const activeList =
    tab === 'all' ? allUsers : tab === 'owners' ? owners : drivers;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeList;
    return activeList.filter((u) => {
      const base =
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q) ||
        roleLabel(u.role).toLowerCase().includes(q);
      if (u.role === ROLES.DRIVER) {
        const license = driversByUserId[u._id]?.licenseNumber ?? '';
        return base || license.toLowerCase().includes(q);
      }
      if (u.role === ROLES.VEHICLE_OWNER) {
        return base || String(vehicleCounts[u._id] ?? '').includes(q);
      }
      return base;
    });
  }, [activeList, search, driversByUserId, vehicleCounts]);

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

  const openEdit = (u: UserRecord) => {
    const linkedDriver = driversByUserId[u._id];
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      licenseNumber: linkedDriver?.licenseNumber ?? '',
    });
    setEditingDriverId(linkedDriver?._id ?? null);
    setEditingUser(u);
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    const isDriver = editingUser.role === ROLES.DRIVER;
    if (isDriver && !editForm.licenseNumber.trim()) {
      toast.error('License number is required for drivers');
      return;
    }
    setSavingEdit(true);
    try {
      await usersService.update(editingUser._id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
      });
      if (isDriver && editingDriverId) {
        await driversService.update(editingDriverId, {
          fullName: editForm.fullName.trim(),
          phone: editForm.phone.trim(),
          licenseNumber: editForm.licenseNumber.trim(),
        });
      }
      toast.success('User updated successfully');
      setEditingUser(null);
      setEditingDriverId(null);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update user'));
    } finally {
      setSavingEdit(false);
    }
  };

  const requestDelete = (u: UserRecord) => {
    setDeletingUser(u);
    setMenuOpenId(null);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await usersService.remove(deletingUser._id);
      toast.success('User deleted successfully');
      setDeletingUser(null);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  };

  const resetPassword = async (u: UserRecord) => {
    try {
      await authService.forgotPassword(u.email);
      toast.success(`Password reset email sent to ${u.email}`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send reset email'));
    } finally {
      setMenuOpenId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            <Link to={ROUTES.COMPANY_DASHBOARD} className="hover:text-fleet-600">
              FleetTrack
            </Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600">Users</span>
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Users Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-[15px]">
            Efficiently manage your fleet network. Handle vehicle owners and drivers profile,
            monitor their activity status, and manage access permissions from a single
            interface.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Create Owner
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Create Driver
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Edit User
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              Suspend User
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              Delete User
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              Reset Password
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toast.info('Support — contact your platform administrator')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Headphones className="h-4 w-4" />
              Support
            </button>
            {tab === 'all' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('owners');
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-fleet-200 bg-fleet-50 px-4 py-2.5 text-sm font-semibold text-fleet-700 shadow-sm hover:bg-fleet-100"
                >
                  <Plus className="h-4 w-4" />
                  Add Owner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('drivers');
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Driver
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setModalTab(tab);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
              >
                <Plus className="h-4 w-4" />
                Add New
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabs + filter / export */}
      <section className="border-b border-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-6 sm:gap-8">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                tab === 'all'
                  ? 'border-fleet-500 text-fleet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              All Users
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  tab === 'all'
                    ? 'bg-fleet-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allUsers.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('owners')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                tab === 'owners'
                  ? 'border-fleet-500 text-fleet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Vehicle Owners
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  tab === 'owners'
                    ? 'bg-fleet-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {owners.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab('drivers')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                tab === 'drivers'
                  ? 'border-fleet-500 text-fleet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Drivers
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  tab === 'drivers'
                    ? 'bg-fleet-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {drivers.length}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 pb-3">
            {tab === 'all' && (
              <p className="mr-2 hidden text-sm text-slate-500 sm:block">
                {owners.length} owners · {drivers.length} drivers
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              className={`rounded-lg border p-2.5 shadow-sm transition ${
                showSearch
                  ? 'border-fleet-500 bg-fleet-50 text-fleet-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
              aria-label="Filter / search"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => exportCsv(filtered, tab, vehicleCounts, driversByUserId)}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:bg-slate-50"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {tab === 'all' && (
        <p className="text-sm text-slate-500 sm:hidden">
          {owners.length} owners · {drivers.length} drivers — combined table view
        </p>
      )}

      {showSearch && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users, IDs, or vehicles..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            autoFocus
          />
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Full Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Phone</th>
                {tab === 'all' && <th className="px-5 py-3.5">Role</th>}
                {(tab === 'all' || tab === 'owners') && (
                  <th className="px-5 py-3.5">Vehicles</th>
                )}
                {(tab === 'all' || tab === 'drivers') && (
                  <th className="px-5 py-3.5">License</th>
                )}
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={tableColCount(tab)}
                    className="px-5 py-16 text-center text-slate-400"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={tableColCount(tab)} className="px-5 py-14">
                    <div className="flex flex-col items-center text-center">
                      <p className="font-semibold text-slate-700">
                        {tab === 'all'
                          ? 'No users yet'
                          : tab === 'owners'
                            ? 'No vehicle owners yet'
                            : 'No drivers yet'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Click <span className="font-medium">Add New</span> to create one.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((u) => (
                  <tr
                    key={u._id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                          {initials(u.fullName)}
                        </span>
                        <span className="font-semibold text-slate-900">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4 text-slate-700">{u.phone}</td>
                    {tab === 'all' && (
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                    )}
                    {(tab === 'all' || tab === 'owners') && (
                      <td className="px-5 py-4 text-slate-600">
                        {u.role === ROLES.VEHICLE_OWNER ? (
                          <span className="inline-flex min-w-8 justify-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {String(vehicleCounts[u._id] ?? 0).padStart(2, '0')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    {(tab === 'all' || tab === 'drivers') && (
                      <td className="px-5 py-4 text-slate-600">
                        {u.role === ROLES.DRIVER
                          ? driversByUserId[u._id]?.licenseNumber ?? '—'
                          : '—'}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-4">
                      <ActionMenuDropdown
                        open={menuOpenId === u._id}
                        onOpenChange={(isOpen) => setMenuOpenId(isOpen ? u._id : null)}
                        trigger={<MoreHorizontal className="h-5 w-5" />}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => openEdit(u)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => toggleSuspend(u)}
                          className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => resetPassword(u)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset Password
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => requestDelete(u)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </ActionMenuDropdown>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            {filtered.length === 0
              ? '0 users'
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} users`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-8 rounded-lg px-2.5 py-1 text-sm font-medium ${
                  p === page
                    ? 'bg-fleet-500 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <AddUserModal
        open={modalOpen}
        tab={tab === 'all' ? modalTab : tab}
        companyId={user?.companyId}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setEditingUser(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser.role === ROLES.DRIVER ? 'Edit Driver' : 'Edit User'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
              {editingUser.role === ROLES.DRIVER && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    License Number
                  </label>
                  <input
                    required
                    value={editForm.licenseNumber}
                    onChange={(e) =>
                      setEditForm({ ...editForm, licenseNumber: e.target.value })
                    }
                    placeholder="DL123456789"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setDeletingUser(null)}
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Delete User?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove <span className="font-semibold">{deletingUser.fullName}</span>.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
