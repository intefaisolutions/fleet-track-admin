import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  IndianRupee,
  Loader2,
  QrCode,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  platformService,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { paymentsService } from '../../services/payments.service';
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
  const [transactionId, setTransactionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      .finally(() => setLoading(false));
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.monthlyPriceInr - b.monthlyPriceInr),
    [plans],
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.planType === selectedPlanType) ?? null,
    [plans, selectedPlanType],
  );

  const upiId =
    paymentSettings.upiId?.trim() ||
    paymentSettings.defaultUpiId?.trim() ||
    '';
  const amount = selectedPlan?.monthlyPriceInr ?? 0;
  const atLimit = limit > 0 && used >= limit;

  const upiLink = useMemo(() => {
    if (!upiId || !amount) return '';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('FleetTrack')}&am=${amount}&cu=INR&tn=${encodeURIComponent(selectedPlan?.displayName ?? selectedPlan?.planType ?? 'Plan')}`;
  }, [upiId, amount, selectedPlan]);

  const submitPayment = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }
    if (!upiId) {
      toast.error('Payment UPI is not configured. Contact your company admin.');
      return;
    }
    if (transactionId.trim().length < 6) {
      toast.error('Please enter a valid transaction ID');
      return;
    }

    setSaving(true);
    try {
      await paymentsService.submit({
        planType: selectedPlan.planType,
        amount: selectedPlan.monthlyPriceInr,
        paymentMethod: 'UPI',
        transactionId: transactionId.trim(),
        upiId,
        notes: `Owner upgrade to ${selectedPlan.displayName ?? selectedPlan.planType}`,
      });
      setSubmitted(true);
      toast.success('Payment submitted. Company Owner will verify shortly.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not submit payment'));
    } finally {
      setSaving(false);
    }
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Upgrade Plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add more vehicles when you reach your plan limit. Pay via UPI and submit your
          transaction ID for verification.
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
                  Up to {plan.vehicleLimit} vehicles
                </p>
                {plan.description && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-600">
                    {plan.description}
                  </p>
                )}
              </button>
            );
          })}
        </section>
      )}

      {selectedPlan && (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Payment Instructions</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-700">
              <li>Select your desired plan above.</li>
              <li>Pay using PhonePe or Google Pay to the UPI ID below.</li>
              <li>Return here and tap &quot;I Have Paid&quot; with your transaction ID.</li>
              <li>Company Owner verifies payment — your plan updates automatically.</li>
            </ol>

            <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-500">UPI ID</p>
                <p className="font-semibold text-slate-900">
                  {upiId || 'Not configured — ask Company Admin'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="font-semibold text-slate-900">
                  {formatInr(amount)} ({selectedPlan.displayName ?? selectedPlan.planType})
                </p>
              </div>
            </div>

            {upiLink && (
              <a
                href={upiLink}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-fleet-200 bg-fleet-50 px-4 py-2.5 text-sm font-semibold text-fleet-700 hover:bg-fleet-100"
              >
                <QrCode className="h-4 w-4" />
                Open UPI App
              </a>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">I Have Paid</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your UPI transaction ID.</p>

            <div className="mt-4 space-y-3">
              <input
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                placeholder="TXN123456789"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
              />
              <button
                type="button"
                onClick={submitPayment}
                disabled={saving || submitted || !upiId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {saving ? 'Submitting...' : submitted ? 'Submitted' : 'I Have Paid'}
              </button>
            </div>

            {submitted && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment submitted successfully.
                </p>
                <p className="mt-1 text-xs">
                  Company Owner will verify your bank payment and upgrade your vehicle limit.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
