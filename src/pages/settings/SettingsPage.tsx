import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  KeyRound,
  Pencil,
  Plus,
  Settings,
  TrendingUp,
  UserCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

interface SupportAdmin {
  name: string;
  email: string;
  phone: string;
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

const PERMISSION_OPTIONS = [
  { value: 'dashboard:read', label: 'View Dashboard' },
  { value: 'licenses:read', label: 'View Licenses' },
  { value: 'payments:write', label: 'Manage Payments' },
  { value: 'companies:read', label: 'View Companies' },
  { value: 'companies:write', label: 'Manage Companies' },
  { value: 'payments:read', label: 'View Payments' },
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
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const togglePermission = (value: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(value)
        ? f.permissions.filter((p) => p !== value)
        : [...f.permissions, value],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.permissions.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setLoading(true);
    try {
      await platformService.addSupportAdmin(form);
      toast.success('Support admin added');
      setForm({ name: '', email: '', phone: '', password: '', permissions: [] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to add admin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">Add Support Admin</h2>
          <button type="button" onClick={onClose} className="text-slate-400">
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
          <input
            required
            placeholder="Phone number (+91...)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
          />
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
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [supportAdmins, setSupportAdmins] = useState<SupportAdmin[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SupportAdmin | null>(null);

  const loadSupportAdmins = useCallback(() => {
    platformService
      .getSupportAdmins()
      .then((res) => setSupportAdmins(res.data ?? []))
      .catch(() => setSupportAdmins([]));
  }, []);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      });
    }
    loadSupportAdmins();
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

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authService.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      if (res.data && user) {
        setUser({ ...user, ...res.data });
      }
      if (passwords.oldPassword && passwords.newPassword) {
        await authService.changePassword(passwords.oldPassword, passwords.newPassword);
        setPasswords({ oldPassword: '', newPassword: '' });
        toast.success('Profile and password updated');
      } else {
        toast.success('Profile saved');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

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
            Manage your personal account preferences and support administrative permissions.
          </p>
        </div>
        <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 md:block" aria-hidden>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-fleet-500/20">
            <Settings className="h-10 w-10 text-fleet-300" />
          </div>
        </div>
      </div>

      {/* My Profile */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      >
        <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
        <div className="mt-6 flex flex-col gap-8 lg:flex-row">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={profile.fullName}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fleet-100">
                  <UserCircle className="h-14 w-14 text-fleet-500" />
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-fleet-500 p-1.5 text-white shadow"
                onClick={() => toast.info('Avatar upload — coming soon')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-xs text-slate-500">Avatar Upload</span>
          </div>

          <div className="grid flex-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                readOnly
                value={profile.email}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Old Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={passwords.oldPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, oldPassword: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-fleet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

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

      {/* Support Admin Team */}
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
    </div>
  );
}
