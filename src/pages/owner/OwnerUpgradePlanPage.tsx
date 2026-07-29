import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { IndianRupee, Loader2, Sparkles } from 'lucide-react';
import { SubscriptionPaymentPanel } from '../../components/payments/SubscriptionPaymentPanel';
import {
  platformService,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { reportsService } from '../../services/reports.service';
import { getApiErrorMessage } from '../../utils/validation';

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function OwnerUpgradePlanPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [planLabel, setPlanLabel] = useState('Free Plan');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      platformService.getPlans(),
      platformService.getPaymentSettings(),
      reportsService.getOwnerDashboard(),
    ])
      .then(([plansRes, settingsRes, dashRes]) => {
        if (plansRes.status === 'fulfilled') {
          const list = (plansRes.value.data as SubscriptionPlanRecord[]) ?? [];
          setPlans(list);
          if (list.length > 0) {
            setSelectedPlanType((prev) => prev || list[0].planType);
          }
        }
        if (settingsRes.status === 'fulfilled') {
          setPaymentSettings((settingsRes.value.data as Record<string, string>) ?? {});
        }
        if (dashRes.status === 'fulfilled') {
          const d = dashRes.value.data;
          if (d) {
            setUsed(d.totalVehicles ?? 0);
            setLimit(d.myVehiclesLimit ?? 0);
            setPlanLabel(d.subscription?.planLabel ?? 'Free Plan');
          }
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

  const selectedPlan = useMemo(
    () => plans.find((p) => p.planType === selectedPlanType) ?? null,
    [plans, selectedPlanType],
  );

  const atLimit = limit > 0 && used >= limit;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading plans...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Upgrade Plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pay with Razorpay for instant activation, or Manual UPI / Bank Transfer for
          verification-based upgrade.
        </p>
      </div>

      <section
        className={`rounded-xl border px-4 py-3 text-sm ${
          atLimit
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-sky-200 bg-sky-50 text-sky-900'
        }`}
      >
        <p className="font-semibold">
          {planLabel} — {used}/{limit || '—'} vehicles used
        </p>
        <p className="mt-1 text-xs opacity-90">
          {atLimit
            ? 'Limit reached. Upgrade to register more vehicles.'
            : `You can add ${Math.max(0, limit - used)} more vehicle${limit - used === 1 ? '' : 's'}.`}
        </p>
      </section>

      {sortedPlans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          No subscription plans configured yet.
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const active = selectedPlanType === plan.planType;
            return (
              <button
                key={plan.planType}
                type="button"
                onClick={() => setSelectedPlanType(plan.planType)}
                className={`rounded-xl border p-5 text-left transition ${
                  active
                    ? 'border-fleet-500 bg-fleet-50 shadow-md ring-1 ring-fleet-200'
                    : 'border-slate-200 bg-white hover:border-fleet-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {plan.displayName ?? plan.planType}
                  </p>
                  {active && <Sparkles className="h-4 w-4 text-fleet-500" />}
                </div>
                <p className="mt-2 flex items-center gap-1 text-2xl font-bold text-slate-900">
                  <IndianRupee className="h-5 w-5" />
                  {plan.monthlyPriceInr}
                  <span className="text-xs font-normal text-slate-500">/ month</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Up to {plan.vehicleLimit} vehicles · {formatInr(plan.yearlyPriceInr)}/year
                </p>
              </button>
            );
          })}
        </section>
      )}

      {selectedPlan && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Pay & Upgrade</h2>
          <div className="mt-4">
            <SubscriptionPaymentPanel
              selectedPlan={selectedPlan}
              paymentSettings={paymentSettings}
              onSuccess={() => setTimeout(() => reload(), 800)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
