import { useCallback, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { ASSETS } from '../../config/assets';
import {
  companiesService,
  type CompanySubAdmin,
  type CompanySubAdminsPayload,
} from '../../services/companies.service';
import {
  AddSubAdminModal,
  permissionLabel,
} from '../../components/company/AddSubAdminModal';
import { getApiErrorMessage } from '../../utils/validation';

const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function joinedLabel(invitedAt?: string) {
  if (!invitedAt) return 'Recently invited';
  const date = new Date(invitedAt);
  if (Number.isNaN(date.getTime())) return 'Recently invited';
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Joined today';
  if (days === 1) return 'Joined 1 day ago';
  if (days < 30) return `Joined ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'Joined 1 month ago';
  return `Joined ${months} months ago`;
}

function StatusCell({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  if (s === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function CompanyAdminsPage() {
  const [data, setData] = useState<CompanySubAdminsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    companiesService
      .getSubAdmins()
      .then((res) => setData(res.data ?? { admins: [], stats: { total: 0, active: 0, pending: 0, rolesDefined: 0 } }))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load admins')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const admins = data?.admins ?? [];
  const stats = data?.stats ?? {
    total: 0,
    active: 0,
    pending: 0,
    rolesDefined: 0,
  };

  const totalPages = Math.max(1, Math.ceil(admins.length / PAGE_SIZE));
  const pageAdmins = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return admins.slice(start, start + PAGE_SIZE);
  }, [admins, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleRemove = async (admin: CompanySubAdmin) => {
    const result = await Swal.fire({
      title: 'Remove Sub-Admin?',
      text: `Are you sure you want to remove ${admin.name} from company admins? They will lose access immediately.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-md',
        cancelButton: 'rounded-md',
      },
    });

    if (!result.isConfirmed) return;
    
    setRemovingEmail(admin.email);
    try {
      await companiesService.removeSubAdmin(admin.email);
      toast.success('Sub-admin removed');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to remove admin'));
    } finally {
      setRemovingEmail(null);
    }
  };

  const showingFrom = admins.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, admins.length);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-50">
            <img
              src={ASSETS.logoAdministrationShield}
              alt=""
              className="h-9 w-9 object-contain"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              FleetTrack Administration
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Admins (Sub-Admins)
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Add and manage company sub-admins with limited permissions to help
              in daily operations.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Sub-admins cannot edit vehicles or expenses—those are view-only for your
              company (owners and drivers manage them).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-fleet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
        >
          <Plus className="h-4 w-4" />
          Add Sub-Admin
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Admins" value={stats.total} valueClass="text-slate-900" />
        <StatCard label="Active Now" value={stats.active} valueClass="text-emerald-600" />
        <StatCard
          label="Pending Invites"
          value={stats.pending}
          valueClass="text-amber-600"
        />
        <StatCard
          label="Roles Defined"
          value={stats.rolesDefined}
          valueClass="text-slate-900"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/40 px-5 py-3 text-sm text-slate-600">
          View All Admins: {admins.length} admin{admins.length === 1 ? '' : 's'} managing company
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Permissions</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading admins...
                  </td>
                </tr>
              ) : pageAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No sub-admins yet. Click &quot;Add Sub-Admin&quot; to invite someone.
                  </td>
                </tr>
              ) : (
                pageAdmins.map((admin) => (
                  <tr
                    key={admin.email}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                          {initials(admin.name)}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{admin.name}</p>
                          <p className="text-xs text-slate-500">
                            {joinedLabel(admin.invitedAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{admin.email}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {admin.permissions.map((p) => (
                          <span
                            key={p}
                            className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800"
                          >
                            {permissionLabel(p)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusCell status={admin.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(admin)}
                        disabled={removingEmail === admin.email}
                        className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        aria-label={`Remove ${admin.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && admins.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {showingFrom}–{showingTo} of {admins.length} admin
              {admins.length === 1 ? '' : 's'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <AddSubAdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
