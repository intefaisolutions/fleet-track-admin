import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  KeyRound,
  Lock,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import {
  companiesService,
  type CompanyDetail,
} from '../../services/companies.service';
import { subscriptionsService } from '../../services/subscriptions.service';
import { copyToClipboard } from '../../utils/clipboard';
import { getApiErrorMessage } from '../../utils/validation';
import { uploadImage } from '../../services/storage.service';

function formatExpiry(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CompanySettingsPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    logoUrl: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [licenseKey, setLicenseKey] = useState('—');
  const [periodEnd, setPeriodEnd] = useState<string>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const [companyRes, subRes] = await Promise.all([
        companiesService.getById(user.companyId),
        subscriptionsService.list(),
      ]);
      const c = companyRes.data ?? null;
      const subs = subRes.data ?? [];
      setCompany(c);
      if (c) {
        setCompanyForm({
          name: c.name ?? '',
          phone: c.phone ?? user.phone,
          address: c.address ?? '',
          city: c.city ?? '',
          country: c.country ?? '',
          logoUrl: c.logoUrl ?? '',
        });
        setLogoPreviewUrl(c.logoViewUrl || c.logoUrl || '');
        const key = c.licenseKey?.trim();
        setLicenseKey(key || '—');
        const expiry = c.licenseValidUntil ?? subs[0]?.currentPeriodEnd;
        if (expiry) {
          setPeriodEnd(expiry);
        }
      } else if (subs[0]?.currentPeriodEnd) {
        setPeriodEnd(subs[0].currentPeriodEnd);
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load settings'));
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
      await companiesService.update(user.companyId, {
        name: companyForm.name.trim(),
        phone: companyForm.phone.trim(),
        address: companyForm.address.trim() || undefined,
        city: companyForm.city.trim() || undefined,
        country: companyForm.country.trim() || undefined,
        logoUrl: companyForm.logoUrl || undefined,
      });
      toast.success('Company profile updated');
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

  const onLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be 5MB or smaller');
      return;
    }
    setUploadingLogo(true);
    try {
      const uploaded = await uploadImage(file, 'companies');
      setCompanyForm((prev) => ({ ...prev, logoUrl: uploaded.url }));
      setLogoPreviewUrl(uploaded.viewUrl || uploaded.url);
      toast.success('Logo uploaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Logo upload failed'));
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage company profile, admin account settings, and license details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — company profile + password */}
        <div className="space-y-6 lg:col-span-2">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-fleet-600" />
              Update Company Profile
            </h2>
            <div className="mt-6 flex flex-col gap-8 sm:flex-row">
              <div className="flex flex-col items-center gap-2">
                {logoPreviewUrl || companyForm.logoUrl ? (
                  <img
                    src={logoPreviewUrl || companyForm.logoUrl}
                    alt="Company logo"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fleet-100">
                    <Building2 className="h-14 w-14 text-fleet-500" />
                  </div>
                )}
                <label
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
                    uploadingLogo ? 'pointer-events-none opacity-60' : ''
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? 'Uploading…' : 'Upload Company Logo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={onLogoUpload}
                  />
                </label>
              </div>

              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Company Name
                  </label>
                  <input
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    readOnly
                    value={company?.email ?? '—'}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Address
                  </label>
                  <input
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    placeholder="Street address"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">City</label>
                  <input
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Country</label>
                  <input
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
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
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Lock className="h-5 w-5 text-fleet-600" />
              Change Password
            </h2>
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
        </div>

        {/* Right — license details */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <KeyRound className="h-4 w-4 text-fleet-600" />
              View License Details
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">License Key</p>
              <p className="mt-1 break-all font-mono text-sm font-semibold tracking-wide text-slate-900">
                {licenseKey}
              </p>
              {licenseKey !== '—' && (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const ok = await copyToClipboard(licenseKey);
                      if (ok) toast.success('License key copied');
                      else toast.error('Could not copy license key');
                    })();
                  }}
                  className="mt-2 text-xs font-medium text-fleet-600 hover:underline"
                >
                  Copy key
                </button>
              )}
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Valid Until</p>
              <p className="mt-1 font-semibold text-slate-900">{formatExpiry(periodEnd)}</p>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Logo appears on exported reports and app header.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
