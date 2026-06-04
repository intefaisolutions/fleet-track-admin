import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  KeyRound,
  Plus,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES, supportAdminHasPermission } from '../../config/constants';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage, validatePhone } from '../../utils/validation';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

interface SupportAdmin {
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
  status?: string;
  createdAt?: string;
}

interface DashboardSummary {
  revenueThisMonth?: number;
  activeCompanies?: number;
  activeLicenses?: number;
  expiringSoon?: number;
}

const READ_PERMISSION_VALUES = [
  'platform:read',
  'dashboard:read',
  'licenses:read',
  'companies:read',
  'payments:read',
  'settings:read',
] as const;

const PERMISSION_OPTIONS = [
  { value: 'platform:read', label: 'Full platform read (same data as Super Admin)' },
  { value: 'dashboard:read', label: 'View Dashboard' },
  { value: 'licenses:read', label: 'View Licenses' },
  { value: 'companies:read', label: 'View Companies' },
  { value: 'payments:read', label: 'View Revenue & Payments' },
  { value: 'settings:read', label: 'View Plans & Settings' },
  { value: 'payments:write', label: 'Manage Payments' },
  { value: 'companies:write', label: 'Manage Companies' },
];

function permissionLabel(key: string) {
  return PERMISSION_OPTIONS.find((p) => p.value === key)?.label ?? key;
}

function AddSupportAdminModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    permissions: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const togglePermission = (value: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(value)
        ? f.permissions.filter((p) => p !== value)
        : [...f.permissions, value],
    }));
  };

  const selectAllReadPermissions = () => {
    setForm((f) => ({
      ...f,
      permissions: Array.from(new Set([...f.permissions, ...READ_PERMISSION_VALUES])),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const phoneErr = validatePhone(form.phone, true);
    if (phoneErr) {
      setErrors({ phone: phoneErr });
      toast.error(phoneErr);
      return;
    }
    if (form.permissions.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await platformService.addSupportAdmin({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      toast.success('Support admin added');
      setForm({ name: '', email: '', phone: '', password: '', permissions: [] });
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to add admin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Add Support Admin</h2>
          <button type="button" onClick={handleClose} className="text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
          />
          <div>
            <input
              type="tel"
              required
              placeholder="Phone number (+91...)"
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value });
                setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                errors.phone
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-fleet-500 focus:ring-fleet-500/20'
              }`}
            />
            <FieldError message={errors.phone} />
          </div>
          <input
            type="password"
            minLength={8}
            required
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
          />
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
            <div className="flex flex-wrap gap-2">
              {PERMISSION_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePermission(p.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    form.permissions.includes(p.value)
                      ? 'bg-fleet-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={selectAllReadPermissions}
              className="mt-2 text-sm font-medium text-fleet-600 hover:underline"
            >
              Select all read access (same dashboard/revenue data as Super Admin)
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Adding...' : 'Add Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditPermissionsModal({
  admin,
  open,
  onClose,
  onSave,
}: {
  admin: SupportAdmin | null;
  open: boolean;
  onClose: () => void;
  onSave: (email: string, permissions: string[]) => Promise<void>;
}) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (admin) {
      setPermissions(admin.permissions);
    }
  }, [admin]);

  if (!open || !admin) return null;

  const togglePermission = (value: string) => {
    setPermissions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  };

  const selectAllReadPermissions = () => {
    setPermissions((prev) =>
      Array.from(new Set([...prev, ...READ_PERMISSION_VALUES])),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (permissions.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setLoading(true);
    try {
      await onSave(admin.email, permissions);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Set Permissions</h2>
          <button type="button" onClick={onClose} className="text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{admin.name}</span> ({admin.email})
          </p>
          <div className="flex flex-wrap gap-2">
            {PERMISSION_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePermission(p.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  permissions.includes(p.value)
                    ? 'bg-fleet-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={selectAllReadPermissions}
            className="text-sm font-medium text-fleet-600 hover:underline"
          >
            Select all read access (same dashboard/revenue data as Super Admin)
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save Permissions'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [supportAdmins, setSupportAdmins] = useState<SupportAdmin[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SupportAdmin | null>(null);

  const loadSupportAdmins = useCallback(() => {
    platformService
      .getSupportAdmins()
      .then((res) => setSupportAdmins(res.data ?? []))
      .catch(() => setSupportAdmins([]));
  }, []);

  useEffect(() => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      loadSupportAdmins();
    }

    const canLoadDashboard =
      user?.role === ROLES.SUPER_ADMIN ||
      supportAdminHasPermission(user?.permissions ?? [], 'dashboard:read');

    if (!canLoadDashboard) {
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    platformService
      .getDashboard()
      .then((res) => {
        const data = res.data as
          | { stats?: DashboardSummary; revenueThisMonth?: number; activeCompanies?: number; activeLicenses?: number; expiringSoon?: number }
          | undefined;
        const stats = data?.stats;
        setSummary({
          revenueThisMonth: stats?.revenueThisMonth ?? data?.revenueThisMonth ?? 0,
          activeCompanies: stats?.activeCompanies ?? data?.activeCompanies ?? 0,
          activeLicenses: stats?.activeLicenses ?? data?.activeLicenses ?? 0,
          expiringSoon: stats?.expiringSoon ?? data?.expiringSoon ?? 0,
        });
      })
      .catch(() => setSummary({}))
      .finally(() => setSummaryLoading(false));
  }, [user, loadSupportAdmins]);

  const handleRemoveAdmin = async (email: string) => {
    try {
      await platformService.removeSupportAdmin(email);
      toast.success('Support admin removed');
      loadSupportAdmins();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Remove failed'));
    }
  };

  const handleUpdatePermissions = async (email: string, permissions: string[]) => {
    try {
      await platformService.updateSupportAdminPermissions(email, permissions);
      toast.success('Permissions updated');
      loadSupportAdmins();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-8 text-white shadow-sm">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Account
          </p>
          <h1 className="mt-2 text-3xl font-bold">Settings</h1>
          <p className="mt-2 text-sm text-white/80">
            Platform settings, statistics, and support admin team management.
          </p>
        </div>
        <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 md:block" aria-hidden>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-fleet-500/20">
            <Settings className="h-10 w-10 text-fleet-300" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-lg font-bold text-slate-900">Platform Statistics Summary</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Revenue This Month</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {summaryLoading
                ? '—'
                : `₹${(summary.revenueThisMonth ?? 0).toLocaleString('en-IN')}`}
            </p>
            <TrendingUp className="mt-2 h-4 w-4 text-fleet-500" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Active Companies</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {summaryLoading ? '—' : (summary.activeCompanies ?? 0)}
            </p>
            <Building2 className="mt-2 h-4 w-4 text-fleet-500" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Active Licenses</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {summaryLoading ? '—' : (summary.activeLicenses ?? 0)}
            </p>
            <KeyRound className="mt-2 h-4 w-4 text-fleet-500" />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Expiring Soon</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {summaryLoading ? '—' : (summary.expiringSoon ?? 0)}
            </p>
            <Settings className="mt-2 h-4 w-4 text-fleet-500" />
          </div>
        </div>
      </div>

      {user?.role === ROLES.SUPER_ADMIN && (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Support Admin Team</h2>
          <button
            type="button"
            onClick={() => setAdminModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600"
          >
            <Plus className="h-4 w-4" />
            Add Support Admin
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Phone</th>
                <th className="pb-3 pr-4">Permissions</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {supportAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No support admins yet. Add team members to help manage the platform.
                  </td>
                </tr>
              ) : (
                supportAdmins.map((admin) => (
                  <tr key={admin.email} className="border-b border-slate-50 last:border-0">
                    <td className="py-4 pr-4 font-medium text-slate-900">{admin.name}</td>
                    <td className="py-4 pr-4 text-slate-600">{admin.email}</td>
                    <td className="py-4 pr-4 text-slate-600">{admin.phone}</td>
                    <td className="py-4 pr-4">
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
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingAdmin(admin)}
                          className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                        >
                          Set Permissions
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(admin.email)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <footer className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-xs text-slate-400">
        <span>© 2024 FleetTrack Inc.</span>
        <button type="button" className="hover:text-slate-600">
          Privacy Policy
        </button>
        <button type="button" className="hover:text-slate-600">
          Terms of Service
        </button>
        <button type="button" className="hover:text-slate-600">
          Cookie Settings
        </button>
      </footer>

      {user?.role === ROLES.SUPER_ADMIN && (
        <>
          <AddSupportAdminModal
            open={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            onSuccess={loadSupportAdmins}
          />
          <EditPermissionsModal
            admin={editingAdmin}
            open={!!editingAdmin}
            onClose={() => setEditingAdmin(null)}
            onSave={handleUpdatePermissions}
          />
        </>
      )}
    </div>
  );
}
