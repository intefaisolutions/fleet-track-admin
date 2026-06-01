import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const initialForm = {
  displayName: '',
  description: '',
  vehicleLimit: '10',
  monthlyPriceInr: '0',
  yearlyPriceInr: '0',
  maxAdmins: '2',
  maxOwners: '5',
  maxDrivers: '15',
  features: '',
};

export function CreatePlanModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setLoading(true);
    try {
      const features = form.features
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const res = await platformService.createPlan({
        displayName: form.displayName.trim(),
        description: form.description.trim() || undefined,
        vehicleLimit: Number(form.vehicleLimit),
        monthlyPriceInr: Number(form.monthlyPriceInr),
        yearlyPriceInr: Number(form.yearlyPriceInr),
        maxAdmins: Number(form.maxAdmins),
        maxOwners: Number(form.maxOwners),
        maxDrivers: Number(form.maxDrivers),
        features: features.length ? features : undefined,
      });

      const created = res.data as { planType?: string } | undefined;
      toast.success(
        created?.planType
          ? `Plan created (${created.planType})`
          : 'Plan created successfully',
      );
      setForm(initialForm);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create plan'));
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
          <h2 className="text-lg font-bold text-slate-900">Create Subscription Plan</h2>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Plan name</label>
            <input
              required
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="e.g. Starter Plus"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Saved as plan code (e.g. STARTER_PLUS) for licenses and billing.
            </p>
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
                Vehicle limit
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Monthly ₹</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Yearly ₹</label>
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
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
