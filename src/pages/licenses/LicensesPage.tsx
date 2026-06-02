import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Info,
  MoreHorizontal,
  Plus,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import {
  LicenseSuccessModal,
  type GeneratedLicense,
} from '../../components/licenses/LicenseSuccessModal';
import {
  licensesService,
  type CreateLicensePayload,
  type CreatedLicense,
} from '../../services/licenses.service';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const PLAN_TYPES = ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;
const STATUS_OPTIONS = ['', 'ACTIVE', 'UNUSED', 'EXPIRED', 'REVOKED', 'CANCELLED'];
const PAGE_SIZE = 10;

interface LicenseRow {
  _id: string;
  licenseKey: string;
  intendedCompanyName?: string;
  planType: string;
  status: string;
  validUntil?: string;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  PREMIUM: 'Pro',
  ENTERPRISE: 'Enterprise',
};

function planLabel(plan: string) {
  return PLAN_LABELS[plan] ?? plan;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles =
    s === 'ACTIVE' || s === 'UNUSED'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'EXPIRED'
        ? 'bg-red-100 text-red-800'
        : s === 'REVOKED' || s === 'CANCELLED'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-600';

  const label =
    s === 'UNUSED' ? 'Active' : s.charAt(0) + s.slice(1).toLowerCase();

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

const initialForm = {
  intendedCompanyName: '',
  contactEmail: '',
  contactPhone: '',
  planType: 'PREMIUM',
  maxAdmins: '1',
  maxOwners: '2',
  maxDrivers: '10',
  maxVehicles: '50',
  validUntil: '',
};

function CreateLicensePanel({
  open,
  onClose,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  onGenerated: (license: CreatedLicense) => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [planOptions, setPlanOptions] = useState<{ planType: string; label: string }[]>([]);
  const requiredAsterisk = <span className="ml-1 text-red-500">*</span>;

  useEffect(() => {
    if (!open) return;
    platformService
      .getPlans()
      .then((res) => {
        const plans = (res.data ?? []) as { planType: string; displayName?: string }[];
        setPlanOptions(
          plans.map((p) => ({
            planType: p.planType,
            label: p.displayName ?? planLabel(p.planType),
          })),
        );
      })
      .catch(() => {
        setPlanOptions(PLAN_TYPES.map((p) => ({ planType: p, label: planLabel(p) })));
      });
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: CreateLicensePayload = {
        intendedCompanyName: form.intendedCompanyName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        planType: form.planType,
        validUntil: new Date(form.validUntil).toISOString(),
        maxAdmins: Number(form.maxAdmins),
        maxOwners: Number(form.maxOwners),
        maxDrivers: Number(form.maxDrivers),
        maxVehicles: Number(form.maxVehicles),
      };
      const res = await licensesService.create(payload);
      const created = res.data as CreatedLicense | undefined;
      if (!created?.licenseKey) {
        toast.error('License created but key missing in response');
        return;
      }
      setForm(initialForm);
      onClose();
      onGenerated(created);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to generate license'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Create License</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Company Name
              </label>
              <input
                value={form.intendedCompanyName}
                onChange={(e) => setForm({ ...form, intendedCompanyName: e.target.value })}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Contact Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                placeholder="admin@company.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Contact Phone
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Plan Type
                {requiredAsterisk}
              </label>
              <select
                value={form.planType}
                onChange={(e) => setForm({ ...form, planType: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
              >
                {(planOptions.length ? planOptions : PLAN_TYPES.map((p) => ({
                  planType: p,
                  label: planLabel(p),
                }))).map((p) => (
                  <option key={p.planType} value={p.planType}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role Limits
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['maxAdmins', 'Admins'],
                    ['maxOwners', 'Owners'],
                    ['maxDrivers', 'Drivers'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      {label}
                      {requiredAsterisk}
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Max Vehicles
                {requiredAsterisk}
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.maxVehicles}
                onChange={(e) => setForm({ ...form, maxVehicles: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Valid Until
                {requiredAsterisk}
              </label>
              <input
                type="date"
                required
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
              />
            </div>

            <div className="flex gap-3 rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-slate-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-fleet-500" />
              <p>
                This will generate a unique license key in{' '}
                <span className="font-mono text-xs">FLT-XXXX-YYYY-ZZZZ-WWWW</span> format. Share
                the key with the contact email once generated.
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating...' : 'Generate License'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

export function LicensesPage() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [generatedLicense, setGeneratedLicense] = useState<GeneratedLicense | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [extendTarget, setExtendTarget] = useState<LicenseRow | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    licensesService
      .list(statusFilter || undefined)
      .then((res) => setLicenses((res.data as LicenseRow[]) ?? []))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load licenses')),
      )
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!planFilter) return licenses;
    return licenses.filter((l) => l.planType === planFilter);
  }, [licenses, planFilter]);

  const activeCount = useMemo(
    () => licenses.filter((l) => l.status === 'ACTIVE' || l.status === 'UNUSED').length,
    [licenses],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, planFilter]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('License key copied');
    setMenuId(null);
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this license? The company will not be able to use it.')) return;
    try {
      await licensesService.revoke(id);
      toast.success('License revoked');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Revoke failed'));
    } finally {
      setMenuId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this license permanently?')) return;
    try {
      await licensesService.cancel(id);
      toast.success('License cancelled');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Cancel failed'));
    } finally {
      setMenuId(null);
    }
  };

  const handleExtendSubmit = async () => {
    if (!extendTarget || !extendDate) return;
    try {
      await licensesService.extend(extendTarget._id, new Date(extendDate).toISOString());
      toast.success('License extended');
      setExtendTarget(null);
      setExtendDate('');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Extend failed'));
    }
  };

  const handleSendEmail = async (license: GeneratedLicense) => {
    setSendingEmail(true);
    try {
      await licensesService.sendEmail(license._id);
      toast.success('License key emailed');
      setGeneratedLicense((prev) => (prev ? { ...prev, emailed: true } : prev));
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send email'));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleResendFromTable = async (id: string) => {
    try {
      await licensesService.sendEmail(id);
      toast.success('License key emailed');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to send email'));
    } finally {
      setMenuId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">
            <Link to={ROUTES.DASHBOARD} className="hover:text-fleet-600">
              Admin
            </Link>
            <span className="mx-1.5">›</span>
            <span className="text-slate-600">License Management</span>
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">License Keys</h1>
        </div>
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
        >
          <Plus className="h-4 w-4" />
          Create New License
        </button>
      </div>

      {/* Filters + metric */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-fleet-500"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-fleet-500"
          >
            <option value="">All Plan Types</option>
            {PLAN_TYPES.map((p) => (
              <option key={p} value={p}>
                {planLabel(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[200px] flex-1 items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:max-w-xs lg:ml-auto">
          <div>
            <p className="text-xs font-medium text-slate-500">Active Licenses</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {activeCount.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex h-10 w-16 items-end justify-center gap-0.5 rounded-lg bg-fleet-50 px-2 py-1">
            {[40, 65, 45, 80, 55].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-sm bg-fleet-400"
                style={{ height: `${h}%` }}
              />
            ))}
            <TrendingUp className="ml-1 h-4 w-4 text-fleet-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">License Key</th>
                <th className="px-5 py-3">Company Name</th>
                <th className="px-5 py-3">Plan Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Valid Until</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Loading licenses...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No licenses found. Create your first license key.
                  </td>
                </tr>
              ) : (
                pageRows.map((l) => (
                  <tr
                    key={l._id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-medium text-fleet-600">
                      {l.licenseKey}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {l.intendedCompanyName ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{planLabel(l.planType)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(l.validUntil)}</td>
                    <td className="relative px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setMenuId(menuId === l._id ? null : l._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      {menuId === l._id && (
                        <div className="absolute right-5 top-12 z-10 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => copyKey(l.licenseKey)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Key
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setExtendTarget(l);
                              setExtendDate(
                                l.validUntil
                                  ? new Date(l.validUntil).toISOString().slice(0, 10)
                                  : '',
                              );
                              setMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Extend
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResendFromTable(l._id)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Resend Email
                          </button>
                          {l.status !== 'REVOKED' && l.status !== 'CANCELLED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRevoke(l._id)}
                                className="w-full px-4 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
                              >
                                Revoke
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancel(l._id)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
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
              ? '0 licenses'
              : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} licenses`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-8 rounded-lg px-2 py-1 text-sm font-medium ${
                  p === page ? 'bg-fleet-500 text-white' : 'text-slate-600 hover:bg-slate-100'
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
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <CreateLicensePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onGenerated={(license) => {
          setGeneratedLicense(license);
          load();
        }}
      />

      {generatedLicense && (
        <LicenseSuccessModal
          license={generatedLicense}
          onClose={() => setGeneratedLicense(null)}
          onSendEmail={() => handleSendEmail(generatedLicense)}
          sendingEmail={sendingEmail}
        />
      )}

      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setExtendTarget(null)}
          />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Extend License</h3>
            <p className="mt-1 font-mono text-xs text-slate-500">{extendTarget.licenseKey}</p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              New expiry date
            </label>
            <input
              type="date"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtendSubmit}
                className="flex-1 rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
