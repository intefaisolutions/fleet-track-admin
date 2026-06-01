import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowRight,
  Check,
  UserCircle,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import {
  companiesService,
  type CompanyDetail,
} from '../../services/companies.service';
import { subscriptionsService } from '../../services/subscriptions.service';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free Plan',
  BASIC: 'Basic Plan',
  STANDARD: 'Standard Plan',
  PREMIUM: 'Premium Plan',
  ENTERPRISE: 'Enterprise Plan',
};

function planLabel(type?: string) {
  return PLAN_LABELS[type ?? 'FREE'] ?? 'Free Plan';
}

function formatExpiry(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function planFeatures(planType: string, vehicleLimit: number) {
  const premiumPlus = ['PREMIUM', 'ENTERPRISE'].includes(planType);
  const notFree = planType !== 'FREE';
  return [
    { label: `Up to ${vehicleLimit} vehicles`, included: true },
    { label: 'Standard analytics', included: notFree },
    { label: 'Real-time tracking', included: premiumPlus },
  ];
}

export function CompanySettingsPage() {
  const { user, setUser } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [planType, setPlanType] = useState('FREE');
  const [vehicleLimit, setVehicleLimit] = useState(5);
  const [monthlyPrice, setMonthlyPrice] = useState(0);
  const [periodEnd, setPeriodEnd] = useState<string>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const [companyRes, subRes, plansRes] = await Promise.all([
        companiesService.getById(user.companyId),
        subscriptionsService.list(),
        platformService.getPlans(),
      ]);
      const c = companyRes.data ?? null;
      setCompany(c);
      if (c) {
        const addr = [c.address, c.city, c.country].filter(Boolean).join(', ');
        setProfile({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          address: addr,
        });
        setPlanType(c.planType ?? 'FREE');
        setVehicleLimit(c.vehicleLimit ?? 5);
      }
      const subs = subRes.data ?? [];
      if (subs[0]) {
        setPlanType(subs[0].planType);
        setVehicleLimit(subs[0].vehicleLimit);
        setPeriodEnd(subs[0].currentPeriodEnd);
      }
      const plans = (plansRes.data ?? []) as {
        planType: string;
        monthlyPriceInr: number;
      }[];
      const match = plans.find((p) => p.planType === (subs[0]?.planType ?? c?.planType));
      if (match) setMonthlyPrice(match.monthlyPriceInr);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.companyId) return;
    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      if (res.data && user) {
        setUser({ ...user, ...res.data });
      }
      const addressParts = profile.address.split(',').map((s) => s.trim());
      await companiesService.update(user.companyId, {
        address: addressParts[0] || undefined,
        city: addressParts[1] || undefined,
        country: addressParts[2] || undefined,
      });
      toast.success('Profile saved');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await authService.changePassword(passwords.oldPassword, passwords.newPassword);
      toast.success('Password updated');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Password update failed'));
    } finally {
      setSavingPassword(false);
    }
  };

  const features = planFeatures(planType, vehicleLimit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings &amp; Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account preferences and fleet settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — profile + security */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal Profile */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="text-lg font-bold text-slate-900">Personal Profile</h2>
            <div className="mt-6 flex flex-col gap-8 sm:flex-row">
              <div className="flex flex-col items-center gap-2">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={profile.fullName}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fleet-100">
                    <UserCircle className="h-16 w-16 text-fleet-500" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toast.info('Photo upload — coming soon')}
                  className="text-sm font-medium text-fleet-600 hover:underline"
                >
                  Change Photo
                </button>
              </div>

              <div className="grid flex-1 gap-4 sm:grid-cols-2">
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
                    Phone Number
                  </label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    readOnly
                    value={profile.email}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Business Address
                  </label>
                  <textarea
                    rows={3}
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Street, city, country"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-lg bg-fleet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Security */}
          <form
            onSubmit={handleUpdatePassword}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="text-lg font-bold text-slate-900">Security</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Current Password
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                />
              </div>
            </div>
            <div className="mt-6">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Company Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-bold text-slate-900">Company Information</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Company Name
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{company?.name ?? '—'}</p>
                  {company?.status === 'ACTIVE' && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      VERIFIED
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Admin Contact
                </p>
                <p className="mt-1 text-slate-700">{company?.email ?? '—'}</p>
              </div>
              <p className="text-xs text-slate-400">
                Contact platform admin to update company name or verification status.
              </p>
            </div>
          </div>
        </div>

        {/* Right — Plan & Subscription */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Plan &amp; Subscription
            </p>
            <div className="mt-4 flex items-baseline justify-between">
              <h3 className="text-xl font-bold">{planLabel(planType)}</h3>
              <span className="text-lg font-semibold text-fleet-300">
                {monthlyPrice === 0 ? '₹0' : `₹${monthlyPrice.toLocaleString('en-IN')}`}
                <span className="text-sm font-normal text-white/60">/mo</span>
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-white/10 px-4 py-3">
              <p className="text-xs text-white/60">Expiry Date</p>
              <p className="text-lg font-bold">{formatExpiry(periodEnd)}</p>
            </div>

            <ul className="mt-6 space-y-3">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-sm">
                  {f.included ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-white/30" />
                  )}
                  <span className={f.included ? 'text-white/90' : 'text-white/40'}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to={ROUTES.COMPANY_SUBSCRIPTION}
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-fleet-300 hover:text-fleet-200"
            >
              Upgrade Plan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
