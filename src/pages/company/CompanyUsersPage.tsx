import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { vehiclesService } from '../../services/vehicles.service';
import { authService } from '../../services/auth.service';
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
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('owners');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([usersService.list(), vehiclesService.list()])
      .then(([usersRes, vehiclesRes]) => {
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
      })
      .catch((err: unknown) => {
        setUsers([]);
        setVehicleCounts({});
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

  const openEdit = (u: UserRecord) => {
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
    });
    setEditingUser(u);
    setMenuOpenId(null);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await usersService.update(editingUser._id, editForm);
      toast.success('User updated successfully');
      setEditingUser(null);
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
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          </div>
        </div>
      </section>

      {/* Tabs + filter / export */}
      <section className="border-b border-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-8">
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
              onClick={() => exportCsv(filtered, tab, vehicleCounts)}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:bg-slate-50"
              aria-label="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

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
                {tab === 'owners' && <th className="px-5 py-3.5">Vehicles</th>}
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={tab === 'owners' ? 6 : 5}
                    className="px-5 py-16 text-center text-slate-400"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'owners' ? 6 : 5} className="px-5 py-14">
                    <div className="flex flex-col items-center text-center">
                      <p className="font-semibold text-slate-700">
                        No {tab === 'owners' ? 'vehicle owners' : 'drivers'} yet
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
                    {tab === 'owners' && (
                      <td className="px-5 py-4">
                        <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {String(vehicleCounts[u._id] ?? 0).padStart(2, '0')}
                        </span>
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
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      {menuOpenId === u._id && (
                        <div className="absolute right-5 top-12 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSuspend(u)}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => resetPassword(u)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(u)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
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
        tab={tab}
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
              <h2 className="text-lg font-bold text-slate-900">Edit User</h2>
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
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
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
