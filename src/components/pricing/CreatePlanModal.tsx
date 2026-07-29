import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  platformService,
  PLAN_SUPPORT_TYPES,
  type CreatePlanPayload,
  type SubscriptionPlanRecord,
  type UpdatePlanPayload,
} from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const emptyForm = {
  displayName: '',
  description: '',
  vehicleLimit: '10',
  monthlyPriceInr: '0',
  yearlyPriceInr: '0',
  dataRetentionDays: '30',
  supportType: 'Email',
  maxAdmins: '2',
  maxOwners: '5',
  maxDrivers: '15',
  features: '',
  isActive: true,
};

function planToForm(plan: SubscriptionPlanRecord) {
  return {
    displayName: plan.displayName || plan.planType,
    description: plan.description || '',
    vehicleLimit: String(plan.vehicleLimit),
    monthlyPriceInr: String(plan.monthlyPriceInr),
    yearlyPriceInr: String(plan.yearlyPriceInr),
    dataRetentionDays: String(plan.dataRetentionDays ?? 30),
    supportType: plan.supportType || 'Email',
    maxAdmins: String(plan.maxAdmins ?? 2),
    maxOwners: String(plan.maxOwners ?? 5),
    maxDrivers: String(plan.maxDrivers ?? 15),
    features: (plan.features ?? []).join('\n'),
    isActive: plan.isActive !== false,
  };
}

export function PlanFormModal({
  open,
  mode,
  plan,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  plan?: SubscriptionPlanRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(mode === 'edit' && plan ? planToForm(plan) : emptyForm);
  }, [open, mode, plan]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      toast.error('Plan name is required');
      return;
    }

    const features = form.features
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload: CreatePlanPayload = {
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      vehicleLimit: Number(form.vehicleLimit),
      monthlyPriceInr: Number(form.monthlyPriceInr),
      yearlyPriceInr: Number(form.yearlyPriceInr),
      dataRetentionDays: Number(form.dataRetentionDays),
      supportType: form.supportType,
      maxAdmins: Number(form.maxAdmins),
      maxOwners: Number(form.maxOwners),
      maxDrivers: Number(form.maxDrivers),
      features: features.length ? features : undefined,
      isActive: form.isActive,
    };

    if (
      Number.isNaN(payload.vehicleLimit) ||
      payload.vehicleLimit < 1 ||
      Number.isNaN(payload.monthlyPriceInr) ||
      Number.isNaN(payload.yearlyPriceInr) ||
      Number.isNaN(payload.dataRetentionDays!) ||
      (payload.dataRetentionDays ?? 0) < 1
    ) {
      toast.error('Enter valid numeric values');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        const res = await platformService.createPlan(payload);
        const created = res.data;
        toast.success(
          created?.planType
            ? `Plan created (${created.planType})`
            : 'Plan created successfully',
        );
      } else if (plan) {
        const update: UpdatePlanPayload = { ...payload };
        await platformService.updatePlan(plan.planType, update);
        toast.success('Plan updated. Existing subscribers keep their current plan.');
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          mode === 'create' ? 'Failed to create plan' : 'Failed to update plan',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'create' ? 'Create Subscription Plan' : 'Edit Subscription Plan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Plan Name</label>
            <input
              required
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="e.g. Starter Plus"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
            />
            {mode === 'create' ? (
              <p className="mt-1 text-xs text-slate-500">
                Saved as plan code (e.g. STARTER_PLUS) for licenses and billing.
              </p>
            ) : plan ? (
              <p className="mt-1 text-xs text-slate-500">
                Plan code: <span className="font-mono">{plan.planType}</span> (immutable)
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Subtitle</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Mid-size fleets"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Vehicle Limit
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.vehicleLimit}
                onChange={(e) => setForm({ ...form, vehicleLimit: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Monthly Price ₹
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.monthlyPriceInr}
                onChange={(e) => setForm({ ...form, monthlyPriceInr: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Yearly Price ₹
              </label>
              <input
                type="number"
                min={0}
                required
                value={form.yearlyPriceInr}
                onChange={(e) => setForm({ ...form, yearlyPriceInr: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Data Retention (days)
              </label>
              <input
                type="number"
                min={1}
                required
                value={form.dataRetentionDays}
                onChange={(e) => setForm({ ...form, dataRetentionDays: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Support Type
              </label>
              <select
                value={form.supportType}
                onChange={(e) => setForm({ ...form, supportType: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
              >
                {PLAN_SUPPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['maxAdmins', 'maxOwners', 'maxDrivers'] as const).map((key) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {key === 'maxAdmins' ? 'Admins' : key === 'maxOwners' ? 'Owners' : 'Drivers'}
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

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Features (one per line)
            </label>
            <textarea
              rows={3}
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder={'Fuel reports\nSMS alerts'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded border-slate-300"
            />
            Active (available for new subscriptions)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
            >
              {loading
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Saving...'
                : mode === 'create'
                  ? 'Create Plan'
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Backward-compatible alias */
export function CreatePlanModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <PlanFormModal
      open={open}
      mode="create"
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
