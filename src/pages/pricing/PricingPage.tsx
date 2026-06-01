import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Check,
  Info,
  Plus,
  Sparkles,
  Star,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { CreatePlanModal } from '../../components/pricing/CreatePlanModal';
import {
  platformService,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const PLAN_ORDER = ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;
const RECOMMENDED = 'PREMIUM';
const ENTERPRISE_CUSTOM_THRESHOLD = 9000;

const PLAN_META: Record<
  string,
  { title: string; subtitle: string; features: string[] }
> = {
  FREE: {
    title: 'Free',
    subtitle: 'Ideal for trial periods',
    features: ['Basic GPS Tracking', 'Mobile App Access'],
  },
  BASIC: {
    title: 'Basic',
    subtitle: 'Small businesses',
    features: ['Real-time Analytics', 'Route Optimization'],
  },
  STANDARD: {
    title: 'Standard',
    subtitle: 'Growing fleets',
    features: ['Geofencing Alerts', 'Fuel Management'],
  },
  PREMIUM: {
    title: 'Premium',
    subtitle: 'Full enterprise power',
    features: ['AI Driver Scorecards', 'Priority Support 24/7'],
  },
  ENTERPRISE: {
    title: 'Enterprise',
    subtitle: 'Unlimited potential',
    features: ['Dedicated Manager', 'Custom Integrations'],
  },
};

type PlanDraft = {
  vehicleLimit: string;
  monthlyPriceInr: string;
  yearlyPriceInr: string;
  isCustomFleet: boolean;
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

function planMeta(plan: SubscriptionPlanRecord) {
  const fallback = PLAN_META[plan.planType];
  return {
    title: plan.displayName ?? fallback?.title ?? plan.planType,
    subtitle: plan.description ?? fallback?.subtitle ?? '',
    features:
      plan.features && plan.features.length > 0
        ? plan.features
        : (fallback?.features ?? []),
  };
}

function planToDraft(plan: SubscriptionPlanRecord): PlanDraft {
  const isEnterprise = plan.planType === 'ENTERPRISE';
  const isCustom =
    isEnterprise && plan.vehicleLimit >= ENTERPRISE_CUSTOM_THRESHOLD;
  return {
    vehicleLimit: isCustom ? '' : String(plan.vehicleLimit),
    monthlyPriceInr: String(plan.monthlyPriceInr),
    yearlyPriceInr: String(plan.yearlyPriceInr),
    isCustomFleet: isCustom,
  };
}

function PlanCard({
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
  const meta = planMeta(plan);
  const recommended = plan.planType === RECOMMENDED;

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
        recommended ? 'border-fleet-500 ring-1 ring-fleet-500/30' : 'border-slate-200'
      }`}
    >
      {recommended && (
        <div className="mb-3 flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-fleet-500 px-3 py-1 text-xs font-bold text-white">
            <Star className="h-3 w-3 fill-current" />
            Recommended
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900">{meta.title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{meta.subtitle}</p>
        {!plan.isSystem && (
          <p className="mt-1 font-mono text-[10px] text-slate-400">{plan.planType}</p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Vehicle Limit
          </label>
          {draft.isCustomFleet ? (
            <input
              type="text"
              value={draft.vehicleLimit}
              onChange={(e) => onChange({ vehicleLimit: e.target.value })}
              placeholder="Custom"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
            />
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={draft.vehicleLimit}
                onChange={(e) => onChange({ vehicleLimit: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
              />
              <span className="shrink-0 text-xs text-slate-500">Fleet Units</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Monthly Price
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.monthlyPriceInr}
                onChange={(e) => onChange({ monthlyPriceInr: e.target.value })}
                className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm outline-none focus:border-fleet-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Yearly Price
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.yearlyPriceInr}
                onChange={(e) => onChange({ yearlyPriceInr: e.target.value })}
                className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-2 text-sm outline-none focus:border-fleet-500"
              />
            </div>
          </div>
        </div>

        <ul className="space-y-2 border-t border-slate-100 pt-4">
          {meta.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-fleet-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className={`mt-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          recommended
            ? 'bg-fleet-500 text-white hover:bg-fleet-600'
            : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </article>
  );
}

export function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [yearlyDiscount, setYearlyDiscount] = useState('20');
  const [stats, setStats] = useState({
    activeSubscriptions: 0,
    pendingTransitions: 0,
    canceledLast30Days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);
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
        setYearlyDiscount(String(data.yearlyDiscountPercent ?? 20));
        setStats(data.stats ?? stats);
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

    let vehicleLimit: number;
    if (draft.isCustomFleet) {
      const parsed = Number(draft.vehicleLimit);
      vehicleLimit =
        draft.vehicleLimit.trim() === '' || Number.isNaN(parsed)
          ? ENTERPRISE_CUSTOM_THRESHOLD
          : parsed;
    } else {
      vehicleLimit = Number(draft.vehicleLimit);
      if (Number.isNaN(vehicleLimit) || vehicleLimit < 1) {
        toast.error('Enter a valid vehicle limit');
        return;
      }
    }

    setSavingPlan(planType);
    try {
      await platformService.updatePlanPricing(planType, {
        monthlyPriceInr: Math.round(monthly),
        yearlyPriceInr: Math.round(yearly),
        vehicleLimit: Math.round(vehicleLimit),
      });
      const saved = plans.find((p) => p.planType === planType);
      toast.success(`${saved ? planMeta(saved).title : planType} plan updated`);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save plan'));
    } finally {
      setSavingPlan(null);
    }
  };

  const saveYearlyDiscount = async () => {
    const percent = Number(yearlyDiscount);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      toast.error('Discount must be between 0 and 100');
      return;
    }

    setSavingDiscount(true);
    try {
      await platformService.updatePaymentSettings({ yearlyDiscountPercent: percent });

      await Promise.all(
        plans.map(async (plan) => {
          const draft = drafts[plan.planType];
          const monthly = Number(draft?.monthlyPriceInr ?? plan.monthlyPriceInr);
          if (monthly <= 0) return;
          const yearly = Math.round(monthly * 12 * (1 - percent / 100));
          await platformService.updatePlanPricing(plan.planType, { yearlyPriceInr: yearly });
        }),
      );

      toast.success('Yearly discount applied to all plans');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save discount'));
    } finally {
      setSavingDiscount(false);
    }
  };

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link to={ROUTES.SETTINGS} className="hover:text-fleet-600">
          Settings
        </Link>
        <span className="mx-1.5 text-slate-300">/</span>
        <span className="text-slate-700">Billing</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <img
            src="/pricing-plans-icon.png"
            alt=""
            className="h-11 w-11 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Configure tiers, limits, and billing for new subscribers
            </p>
          </div>
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

      <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-fleet-500" />
        <p>
          <span className="font-semibold">Important:</span> Price changes apply to new
          subscribers only. Existing active subscriptions keep their current rates until
          updated. Use <span className="font-semibold">Create Plan</span> for custom tiers, then
          assign them via{' '}
          <Link to={ROUTES.LICENSES} className="font-semibold text-fleet-600 hover:underline">
            License Keys
          </Link>
          .
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          Loading subscription plans...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {plans.map((plan) => (
              <PlanCard
                key={plan.planType}
                plan={plan}
                draft={drafts[plan.planType] ?? planToDraft(plan)}
                onChange={(patch) => updateDraft(plan.planType, patch)}
                onSave={() => savePlan(plan.planType)}
                saving={savingPlan === plan.planType}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Global Discount Settings</h2>
              <p className="mt-1 text-sm text-slate-500">
                Yearly discount applied when recalculating annual rates
              </p>
              <div className="mt-5">
                <label className="text-sm font-medium text-slate-700">Yearly Discount %</label>
                <div className="mt-2 flex max-w-xs items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={yearlyDiscount}
                    onChange={(e) => setYearlyDiscount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
                  />
                  <span className="text-sm font-medium text-slate-500">%</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Applying a discount automatically calculates the yearly rates across all
                  active plans unless overridden per plan above.
                </p>
                <button
                  type="button"
                  disabled={savingDiscount}
                  onClick={saveYearlyDiscount}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  {savingDiscount ? 'Applying...' : 'Apply to All Plans'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Subscription Metadata</h2>
              <dl className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <dt className="text-sm text-slate-600">Active Subscriptions</dt>
                  <dd className="text-lg font-bold text-fleet-600">
                    {stats.activeSubscriptions.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <dt className="text-sm text-slate-600">Pending Transitions</dt>
                  <dd className="text-lg font-bold text-slate-900">
                    {stats.pendingTransitions.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-slate-600">Canceled (Last 30d)</dt>
                  <dd className="text-lg font-bold text-red-600">
                    {stats.canceledLast30Days.toLocaleString('en-IN')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </>
      )}

      <CreatePlanModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
