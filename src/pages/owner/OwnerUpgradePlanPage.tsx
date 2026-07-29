import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Check,
  Crown,
  Loader2,
  Sparkles,
  Truck,
  Users,
  Headphones,
  Database,
  ArrowRight,
} from 'lucide-react';
import { SubscriptionPaymentPanel } from '../../components/payments/SubscriptionPaymentPanel';
import {
  platformService,
  parseSupportTypes,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { reportsService } from '../../services/reports.service';
import { getApiErrorMessage } from '../../utils/validation';
import { formatInr } from '../../utils/currency';

type BillingPeriod = 'MONTHLY' | 'YEARLY';

function planTitle(plan: SubscriptionPlanRecord) {
  const raw = (plan.displayName || plan.planType || '').trim();
  if (!raw) return 'Plan';
  // Normalize casual lowercase names like "bonus" / "xyz"
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

  const derived: string[] = [
    `Up to ${plan.vehicleLimit} vehicles`,
  ];
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

export function OwnerUpgradePlanPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [planLabel, setPlanLabel] = useState('Free Plan');
  const [currentPlanType, setCurrentPlanType] = useState('');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const payRef = useRef<HTMLElement>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      platformService.getPlans(),
      platformService.getPaymentSettings(),
      reportsService.getOwnerDashboard(),
    ])
      .then(([plansRes, settingsRes, dashRes]) => {
        let list: SubscriptionPlanRecord[] = [];
        let dashPlanType = '';
        let dashPlanLabel = 'Free Plan';

        if (plansRes.status === 'fulfilled') {
          list = ((plansRes.value.data as SubscriptionPlanRecord[]) ?? []).filter(
            (p) => p.isActive !== false,
          );
          setPlans(list);
        }
        if (settingsRes.status === 'fulfilled') {
          setPaymentSettings((settingsRes.value.data as Record<string, string>) ?? {});
        }
        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data;
          if (d) {
            setUsed(d.totalVehicles ?? 0);
            setLimit(d.myVehiclesLimit ?? 0);
            dashPlanLabel = d.subscription?.planLabel ?? 'Free Plan';
            dashPlanType = d.subscription?.planType ?? '';
            setPlanLabel(dashPlanLabel);
            setCurrentPlanType(dashPlanType);
          }
        }

        if (list.length > 0) {
          setSelectedPlanType((prev) => {
            if (prev && list.some((p) => p.planType === prev)) return prev;
            const current = list.find((p) =>
              matchesCurrentPlan(p, dashPlanType, dashPlanLabel),
            );
            const sorted = [...list].sort(
              (a, b) => a.monthlyPriceInr - b.monthlyPriceInr,
            );
            if (current) {
              const idx = sorted.findIndex((p) => p.planType === current.planType);
              const nextUp = sorted[idx + 1];
              return (nextUp ?? current).planType;
            }
            return sorted[Math.min(1, sorted.length - 1)]?.planType ?? sorted[0].planType;
          });
        }
      })
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load upgrade options')),
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
    // Prefer named Premium/Standard, else middle paid tier
    const named = paid.find((p) =>
      /premium|standard/i.test(p.planType + (p.displayName ?? '')),
    );
    if (named) return named.planType;
    return paid[Math.floor((paid.length - 1) / 2)]?.planType ?? '';
  }, [sortedPlans]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.planType === selectedPlanType) ?? null,
    [plans, selectedPlanType],
  );

  const selectedIsCurrent =
    !!selectedPlan &&
    matchesCurrentPlan(selectedPlan, currentPlanType, planLabel);

  const atLimit = limit > 0 && used >= limit;
  const usagePct =
    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const remaining = Math.max(0, (limit || 0) - used);

  const selectPlan = (planType: string) => {
    setSelectedPlanType(planType);
    window.setTimeout(() => {
      payRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

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
            Upgrade Plan
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Choose a plan that fits your fleet. Billing starts on the day you pay —
            monthly runs for 1 month from purchase, yearly for 1 year. Instant
            activation with Razorpay, or verify via UPI / bank transfer.
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

      {/* Current plan */}
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
                  ? 'Vehicle limit reached — upgrade to add more vehicles.'
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

      {/* Plans */}
      {sortedPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No subscription plans configured yet.
        </div>
      ) : (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Available plans</h2>
              <p className="text-sm text-slate-500">
                Select a plan below, then complete payment.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedPlans.map((plan) => {
              const selected = selectedPlanType === plan.planType;
              const isCurrent = matchesCurrentPlan(plan, currentPlanType, planLabel);
              const isPopular = plan.planType === popularPlanType && !isCurrent;
              const price =
                billingPeriod === 'YEARLY'
                  ? plan.yearlyPriceInr
                  : plan.monthlyPriceInr;
              const periodLabel = billingPeriod === 'YEARLY' ? '/ year' : '/ month';
              const savePct = yearlySavingsPercent(plan);
              const features = planFeatureList(plan);
              const isUpgrade =
                currentPlan != null &&
                plan.monthlyPriceInr > currentPlan.monthlyPriceInr;

              return (
                <article
                  key={plan.planType}
                  className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${
                    selected
                      ? 'border-fleet-500 ring-2 ring-fleet-500/30 shadow-md'
                      : isCurrent
                        ? 'border-emerald-300'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
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

                  <div className="mt-1 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {planTitle(plan)}
                      </h3>
                      {plan.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {plan.description}
                        </p>
                      ) : null}
                    </div>
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
                        ≈ {formatInr(Math.round(plan.yearlyPriceInr / 12))}/month billed yearly
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

                  <button
                    type="button"
                    onClick={() => selectPlan(plan.planType)}
                    disabled={isCurrent && selected}
                    className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isCurrent
                        ? 'cursor-default border border-emerald-200 bg-emerald-50 text-emerald-800'
                        : selected
                          ? 'bg-fleet-500 text-white hover:bg-fleet-600'
                          : isUpgrade
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'border border-slate-200 bg-white text-slate-800 hover:border-fleet-300 hover:bg-fleet-50'
                    }`}
                  >
                    {isCurrent ? (
                      'Your current plan'
                    ) : selected ? (
                      <>
                        Selected
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </>
                    ) : isUpgrade ? (
                      <>
                        Upgrade to {planTitle(plan)}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      'Select plan'
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment */}
      {selectedPlan && (
        <section
          ref={payRef}
          className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pay & activate</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {selectedIsCurrent
                  ? 'This is your current plan. Pick a higher plan above to upgrade.'
                  : `Complete payment for ${planTitle(selectedPlan)} (${
                      billingPeriod === 'YEARLY' ? 'yearly' : 'monthly'
                    }).`}
              </p>
            </div>
            {!selectedIsCurrent && (
              <div className="mt-2 rounded-xl bg-slate-50 px-4 py-2 text-right sm:mt-0">
                <p className="text-xs font-medium text-slate-500">Amount due</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatInr(
                    billingPeriod === 'YEARLY'
                      ? selectedPlan.yearlyPriceInr
                      : selectedPlan.monthlyPriceInr,
                  )}
                </p>
              </div>
            )}
          </div>

          {selectedIsCurrent ? (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              You are already on <strong>{planTitle(selectedPlan)}</strong>. Select
              another plan to change your subscription.
            </div>
          ) : (
            <div className="mt-4">
              <SubscriptionPaymentPanel
                selectedPlan={selectedPlan}
                paymentSettings={paymentSettings}
                billingPeriod={billingPeriod}
                onSuccess={() => setTimeout(() => reload(), 800)}
              />
            </div>
          )}
        </section>
      )}

      <p className="text-center text-xs text-slate-400">
        Razorpay activates instantly after success. Manual UPI / bank transfers stay
        pending until verified. Payments are non-refundable.
      </p>
    </div>
  );
}
