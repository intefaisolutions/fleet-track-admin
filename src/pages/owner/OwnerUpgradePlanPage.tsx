import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Check,
  Crown,
  Info,
  Loader2,
  Sparkles,
  Truck,
  Users,
  Headphones,
  Database,
} from 'lucide-react';
import {
  platformService,
  parseSupportTypes,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import {
  reportsService,
  type CompanyDashboardData,
} from '../../services/reports.service';
import { getApiErrorMessage } from '../../utils/validation';
import { formatInr } from '../../utils/currency';

type BillingPeriod = 'MONTHLY' | 'YEARLY';

function planTitle(plan: SubscriptionPlanRecord) {
  const raw = (plan.displayName || plan.planType || '').trim();
  if (!raw) return 'Plan';
  if (raw === raw.toLowerCase() || raw === raw.toUpperCase()) {
    return raw
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  return raw;
}

function matchesCurrentPlan(
  plan: SubscriptionPlanRecord,
  planType?: string,
  planLabel?: string,
) {
  const type = (planType || '').trim().toUpperCase();
  const label = (planLabel || '').trim().toLowerCase();
  if (type && plan.planType.toUpperCase() === type) return true;
  if (!label) return false;
  const name = planTitle(plan).toLowerCase();
  return (
    label === name ||
    label.includes(name) ||
    name.includes(label.replace(/\s*plan\s*$/i, '').trim())
  );
}

function planFeatureList(plan: SubscriptionPlanRecord): string[] {
  const fromApi = (plan.features ?? []).map((f) => f.trim()).filter(Boolean);
  if (fromApi.length > 0) return fromApi.slice(0, 6);

  const derived: string[] = [`Up to ${plan.vehicleLimit} vehicles`];
  if (plan.maxDrivers != null) {
    derived.push(`Up to ${plan.maxDrivers} drivers`);
  }
  if (plan.maxOwners != null && plan.maxOwners > 0) {
    derived.push(`Up to ${plan.maxOwners} owners`);
  }
  if (plan.dataRetentionDays != null) {
    derived.push(`${plan.dataRetentionDays} days data retention`);
  }
  if (plan.supportType) {
    derived.push(`${plan.supportType} support`);
  }
  if (plan.description?.trim()) {
    derived.push(plan.description.trim());
  }
  return derived.slice(0, 6);
}

function yearlySavingsPercent(plan: SubscriptionPlanRecord) {
  const monthlyYear = plan.monthlyPriceInr * 12;
  if (monthlyYear <= 0 || plan.yearlyPriceInr <= 0) return 0;
  if (plan.yearlyPriceInr >= monthlyYear) return 0;
  return Math.round(((monthlyYear - plan.yearlyPriceInr) / monthlyYear) * 100);
}

/** Vehicle Owners can browse plans only — upgrades are Company Admin exclusive. */
export function OwnerUpgradePlanPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [planLabel, setPlanLabel] = useState('Free Plan');
  const [currentPlanType, setCurrentPlanType] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      platformService.getPlans(),
      reportsService.getOwnerDashboard(),
    ])
      .then(([plansRes, dashRes]) => {
        let list: SubscriptionPlanRecord[] = [];
        let dashPlanType = '';
        let dashPlanLabel = 'Free Plan';

        if (plansRes.status === 'fulfilled') {
          list = ((plansRes.value.data as SubscriptionPlanRecord[]) ?? []).filter(
            (p) => p.isActive !== false,
          );
          setPlans(list);
        }
        if (dashRes.status === 'fulfilled') {
          const dash = dashRes.value.data as CompanyDashboardData | undefined;
          setUsed(dash?.totalVehicles ?? 0);
          setLimit(dash?.myVehiclesLimit ?? 0);
          dashPlanType = dash?.subscription?.planType ?? '';
          dashPlanLabel = dash?.subscription?.planLabel ?? 'Free Plan';
          setCurrentPlanType(dashPlanType);
          setPlanLabel(dashPlanLabel);
        }

        if (plansRes.status === 'rejected' && dashRes.status === 'rejected') {
          toast.error('Failed to load plans');
        }
      })
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load plans')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.monthlyPriceInr - b.monthlyPriceInr),
    [plans],
  );

  const currentPlan = useMemo(
    () =>
      sortedPlans.find((p) => matchesCurrentPlan(p, currentPlanType, planLabel)) ??
      null,
    [sortedPlans, currentPlanType, planLabel],
  );

  const popularPlanType = useMemo(() => {
    const paid = sortedPlans.filter((p) => p.monthlyPriceInr > 0);
    if (paid.length === 0) return '';
    const named = paid.find((p) =>
      /premium|standard/i.test(p.planType + (p.displayName ?? '')),
    );
    if (named) return named.planType;
    return paid[Math.floor((paid.length - 1) / 2)]?.planType ?? '';
  }, [sortedPlans]);

  const atLimit = limit > 0 && used >= limit;
  const usagePct =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, (limit || 0) - used);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading plans...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-fleet-600">
            Subscription
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            View Plans
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Browse your company&apos;s current plan and available options. Plan
            changes can only be made by your Company Admin.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingPeriod('MONTHLY')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              billingPeriod === 'MONTHLY'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod('YEARLY')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              billingPeriod === 'YEARLY'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Yearly
            <span className="ml-1.5 text-[10px] font-bold text-emerald-500">
              Save
            </span>
          </button>
        </div>
      </div>

      <div
        className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        role="status"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div>
          <p className="font-semibold">View only — upgrades are managed by Company Admin</p>
          <p className="mt-0.5 text-sky-800/90">
            You can review plans and limits here. To upgrade or change the
            subscription, please contact your Company Admin. They will handle
            payment and activation from the company portal.
          </p>
        </div>
      </div>

      <section
        className={`overflow-hidden rounded-2xl border shadow-sm ${
          atLimit
            ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
            : 'border-fleet-200 bg-gradient-to-br from-fleet-50 to-white'
        }`}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                atLimit ? 'bg-amber-100 text-amber-700' : 'bg-fleet-500 text-white'
              }`}
            >
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your current plan
              </p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">
                {currentPlan ? planTitle(currentPlan) : planLabel}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {atLimit
                  ? 'Vehicle limit reached — ask your Company Admin to upgrade the plan.'
                  : `You can still add ${remaining} more vehicle${remaining === 1 ? '' : 's'}.`}
              </p>
            </div>
          </div>

          <div className="w-full rounded-xl border border-white/80 bg-white/80 p-4 sm:max-w-xs">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Vehicles used</span>
              <span className="font-bold text-slate-900">
                {used}
                <span className="font-normal text-slate-400"> / {limit || '—'}</span>
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  atLimit ? 'bg-amber-500' : 'bg-fleet-500'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{usagePct}% of limit used</p>
          </div>
        </div>
      </section>

      {sortedPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No subscription plans configured yet.
        </div>
      ) : (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Available plans</h2>
            <p className="text-sm text-slate-500">
              Compare features and pricing. Contact your Company Admin to switch.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedPlans.map((plan) => {
              const isCurrent = matchesCurrentPlan(plan, currentPlanType, planLabel);
              const isPopular = plan.planType === popularPlanType && !isCurrent;
              const price =
                billingPeriod === 'YEARLY'
                  ? plan.yearlyPriceInr
                  : plan.monthlyPriceInr;
              const periodLabel = billingPeriod === 'YEARLY' ? '/ year' : '/ month';
              const savePct = yearlySavingsPercent(plan);
              const features = planFeatureList(plan);

              return (
                <article
                  key={plan.planType}
                  className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                    isCurrent
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : 'border-slate-200'
                  }`}
                >
                  {(isCurrent || isPopular) && (
                    <div className="absolute -top-2.5 left-4 flex gap-1.5">
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                          <Check className="h-3 w-3" strokeWidth={3} />
                          Current
                        </span>
                      )}
                      {isPopular && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-fleet-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                          <Sparkles className="h-3 w-3" />
                          Popular
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {planTitle(plan)}
                    </h3>
                    {plan.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {plan.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <p className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-slate-900">
                        {formatInr(price)}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        {periodLabel}
                      </span>
                    </p>
                    {billingPeriod === 'MONTHLY' && plan.yearlyPriceInr > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        or {formatInr(plan.yearlyPriceInr)}/year
                        {savePct > 0 ? (
                          <span className="ml-1 font-semibold text-emerald-600">
                            (save {savePct}%)
                          </span>
                        ) : null}
                      </p>
                    ) : billingPeriod === 'YEARLY' && plan.monthlyPriceInr > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        ≈ {formatInr(Math.round(plan.yearlyPriceInr / 12))}/month
                        billed yearly
                        {savePct > 0 ? (
                          <span className="ml-1 font-semibold text-emerald-600">
                            · save {savePct}%
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">No payment required</p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      <Truck className="h-3.5 w-3.5 text-fleet-600" />
                      {plan.vehicleLimit} vehicles
                    </span>
                    {plan.maxDrivers != null ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-fleet-600" />
                        {plan.maxDrivers} drivers
                      </span>
                    ) : null}
                    {plan.dataRetentionDays != null ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <Database className="h-3.5 w-3.5 text-fleet-600" />
                        {plan.dataRetentionDays}d data
                      </span>
                    ) : null}
                    {plan.supportType
                      ? parseSupportTypes(plan.supportType).map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            <Headphones className="h-3.5 w-3.5 text-fleet-600" />
                            {s}
                          </span>
                        ))
                      : null}
                  </div>

                  <ul className="mt-4 flex-1 space-y-2 border-t border-slate-100 pt-4">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                          strokeWidth={2.5}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div
                    className={`mt-5 w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                      isCurrent
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {isCurrent ? 'Your current plan' : 'View only'}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        Need a different plan? Ask your Company Admin to upgrade or change the
        subscription from the company portal.
      </p>
    </div>
  );
}
