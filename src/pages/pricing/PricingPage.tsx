import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, Plus, Save } from 'lucide-react';
import { CreatePlanModal } from '../../components/pricing/CreatePlanModal';
import {
  platformService,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const PLAN_ORDER = ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free Plan',
  BASIC: 'Basic Plan',
  STANDARD: 'Standard Plan',
  PREMIUM: 'Premium Plan',
  ENTERPRISE: 'Enterprise Plan',
};

const PLAN_FEATURES: Record<string, string> = {
  FREE: 'Basic logbook, 7-day data.',
  BASIC: 'Fuel cost calculator, driver assignment, export to Excel.',
  STANDARD: 'Maintenance scheduling, document expiry alerts, chat support.',
  PREMIUM: 'Efficiency reports, expense approval workflow, vendor management.',
  ENTERPRISE: 'Custom reports, white-label, 24x7 phone support, 1 year+ data.',
};

type PlanDraft = {
  vehicleLimit: string;
  monthlyPriceInr: string;
  yearlyPriceInr: string;
};

function sortPlans(list: SubscriptionPlanRecord[]) {
  return [...list].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.planType as (typeof PLAN_ORDER)[number]);
    const bi = PLAN_ORDER.indexOf(b.planType as (typeof PLAN_ORDER)[number]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.planType.localeCompare(b.planType);
  });
}

function planToDraft(plan: SubscriptionPlanRecord): PlanDraft {
  return {
    vehicleLimit: String(plan.vehicleLimit),
    monthlyPriceInr: String(plan.monthlyPriceInr),
    yearlyPriceInr: String(plan.yearlyPriceInr),
  };
}

function PlanRow({
  plan,
  draft,
  onChange,
  onSave,
  saving,
}: {
  plan: SubscriptionPlanRecord;
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const key = plan.planType.toUpperCase();
  const featureText = plan.features?.length
    ? plan.features.join(', ')
    : (PLAN_FEATURES[key] ?? '—');
  const planLabel = plan.displayName || PLAN_LABELS[key] || key;
  const vehicleDisplay = key === 'ENTERPRISE' && Number(draft.vehicleLimit) >= 9999
    ? 'Unlimited'
    : `${draft.vehicleLimit} vehicles`;

  return (
    <tr className="border-b border-slate-200">
      <td className="px-3 py-3 text-sm font-semibold text-slate-900">{planLabel}</td>
      <td className="px-3 py-3 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={draft.vehicleLimit}
            onChange={(e) => onChange({ vehicleLimit: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-fleet-500"
          />
          <span className="text-xs text-slate-500">{vehicleDisplay}</span>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center">
          <span className="mr-1.5 text-sm text-slate-500">₹</span>
          <input
            type="number"
            min={0}
            value={draft.monthlyPriceInr}
            onChange={(e) => onChange({ monthlyPriceInr: e.target.value })}
            className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-fleet-500"
          />
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center">
          <span className="mr-1.5 text-sm text-slate-500">₹</span>
          <input
            type="number"
            min={0}
            value={draft.yearlyPriceInr}
            onChange={(e) => onChange({ yearlyPriceInr: e.target.value })}
            className="w-28 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-fleet-500"
          />
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-slate-700">{featureText}</td>
      <td className="px-3 py-3 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-fleet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

export function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    platformService
      .getPricingOverview()
      .then((res) => {
        const data = res.data;
        if (!data) return;
        const list = (data.plans ?? []) as SubscriptionPlanRecord[];
        const sorted = sortPlans(list);
        setPlans(sorted);
        const nextDrafts: Record<string, PlanDraft> = {};
        sorted.forEach((p) => {
          nextDrafts[p.planType] = planToDraft(p);
        });
        setDrafts(nextDrafts);
      })
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load pricing')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (planType: string, patch: Partial<PlanDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [planType]: { ...prev[planType], ...patch },
    }));
  };

  const savePlan = async (planType: string) => {
    const draft = drafts[planType];
    if (!draft) return;

    const monthly = Number(draft.monthlyPriceInr);
    const yearly = Number(draft.yearlyPriceInr);
    if (Number.isNaN(monthly) || Number.isNaN(yearly) || monthly < 0 || yearly < 0) {
      toast.error('Enter valid prices');
      return;
    }

    const vehicleLimit = Number(draft.vehicleLimit);
    if (Number.isNaN(vehicleLimit) || vehicleLimit < 1) {
      toast.error('Enter a valid vehicle limit');
      return;
    }

    setSavingPlan(planType);
    try {
      await platformService.updatePlanPricing(planType, {
        monthlyPriceInr: Math.round(monthly),
        yearlyPriceInr: Math.round(yearly),
        vehicleLimit: Math.round(vehicleLimit),
      });
      const saved = plans.find((p) => p.planType === planType);
      const title = saved?.displayName || PLAN_LABELS[planType] || planType;
      toast.success(`${title} plan updated`);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save plan'));
    } finally {
      setSavingPlan(null);
    }
  };

  const sortedPlans = useMemo(() => sortPlans(plans), [plans]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">4.4 Pricing Settings Page</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-600">
            The Company Owner can set and update subscription prices for all plans.
            When prices are updated, existing subscribers keep their current price (price lock)
            and new subscribers pay the new price.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          Loading subscription plans...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="bg-[#2f75b5] text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Plan</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Vehicle Limit</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Default Monthly Price</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Default Yearly Price</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Key Features</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.map((plan) => (
                  <PlanRow
                    key={plan.planType}
                    plan={plan}
                    draft={drafts[plan.planType] ?? planToDraft(plan)}
                    onChange={(patch) => updateDraft(plan.planType, patch)}
                    onSave={() => savePlan(plan.planType)}
                    saving={savingPlan === plan.planType}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Note: The Company Owner can change any plan price at any time. Changes apply only to
              new subscribers. Existing subscribers continue paying their agreed price.
            </p>
          </div>
        </div>
      )}

      <CreatePlanModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
