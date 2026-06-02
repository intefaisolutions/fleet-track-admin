import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Building2, KeyRound, LogOut, Save, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { companiesService, type CompanyDetail } from '../../services/companies.service';
import { getApiErrorMessage } from '../../utils/validation';

const ADDRESS_KEY = 'ownerProfileAddress';

export function OwnerSettingsPage() {
  const { user, logout, setUser } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [profile, setProfile] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    address: localStorage.getItem(ADDRESS_KEY) ?? '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!user?.companyId) return;
    companiesService
      .getById(user.companyId)
      .then((res) => {
        const c = res.data ?? null;
        setCompany(c);
        if (c?.address && !localStorage.getItem(ADDRESS_KEY)) {
          setProfile((prev) => ({ ...prev, address: c.address ?? '' }));
        }
      })
      .catch(() => {
        setCompany(null);
      });
  }, [user?.companyId]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.fullName.trim() || !profile.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });

      const nextUser = res.data ?? {
        ...(user ?? {}),
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      };

      setUser(nextUser as typeof user);
      localStorage.setItem(ADDRESS_KEY, profile.address.trim());
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword(passwords.oldPassword, passwords.newPassword);
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Profile & Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update profile details, change password, view your company, and logout.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
            <UserRound className="h-4 w-4 text-fleet-500" /> Update Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Full Name</label>
              <input
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phone Number</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Address</label>
              <textarea
                rows={3}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Your address"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        <form onSubmit={changePassword} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
            <KeyRound className="h-4 w-4 text-fleet-500" /> Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Old Password</label>
              <input
                type="password"
                value={passwords.oldPassword}
                onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">New Password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Confirm Password</label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
            <Building2 className="h-4 w-4 text-fleet-500" /> View Company
          </h2>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-slate-900">{company?.name ?? 'ABC Transport Pvt Ltd'}</p>
            <p className="text-slate-600">{company?.email ?? 'company@fleettrack.com'}</p>
            <p className="text-slate-600">{company?.phone ?? '—'}</p>
            <p className="text-slate-500">Company ID: {user?.companyId ?? '—'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="mb-2 text-base font-bold text-red-800">Logout</h2>
          <p className="mb-4 text-sm text-red-700">
            Sign out from your account on this device.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" /> {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
