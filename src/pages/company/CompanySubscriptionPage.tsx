import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, Clock3, CreditCard, Wallet } from 'lucide-react';
import { subscriptionsService, type SubscriptionRecord } from '../../services/subscriptions.service';
import {
  platformService,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { paymentsService } from '../../services/payments.service';
import { getApiErrorMessage } from '../../utils/validation';

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type PaymentStatus = 'NOT_PAID' | 'PENDING' | 'VERIFIED' | 'REJECTED';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function CompanySubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionRecord | null>(
    null,
  );
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [latestPaymentStatus, setLatestPaymentStatus] = useState<PaymentStatus>('NOT_PAID');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      subscriptionsService.list(),
      platformService.getPlans(),
      platformService.getPaymentSettings(),
      paymentsService.list(),
    ])
      .then(([subsResult, plansResult, settingsResult, paymentsResult]) => {
        if (subsResult.status === 'fulfilled') {
          const list = subsResult.value.data ?? [];
          const active =
            list.find((s) => s.status === 'ACTIVE') ??
            list.find((s) => s.status === 'TRIAL') ??
            list[0] ??
            null;
          setCurrentSubscription(active);
        }

        if (plansResult.status === 'fulfilled') {
          setPlans((plansResult.value.data as SubscriptionPlanRecord[]) ?? []);
        }

        if (settingsResult.status === 'fulfilled') {
          setPaymentSettings((settingsResult.value.data as Record<string, string>) ?? {});
        } else {
          setPaymentSettings({});
        }

        if (paymentsResult.status === 'fulfilled') {
          const rows = (paymentsResult.value.data as Array<any>) ?? [];
          setPaymentsHistory(rows);
          const latest = rows[0]?.status?.toUpperCase();
          if (latest === 'VERIFIED') setLatestPaymentStatus('VERIFIED');
          else if (latest === 'PENDING') setLatestPaymentStatus('PENDING');
          else if (latest === 'REJECTED') setLatestPaymentStatus('REJECTED');
          else setLatestPaymentStatus('NOT_PAID');
        }
      })
      .catch(() => {})
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

  const currentPlanLabel = currentSubscription?.planType ?? 'FREE';
  const currentPlanMeta = plans.find((p) => p.planType === currentPlanLabel);

  const handleBuyPlan = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }

    setSubmitting(true);
    try {
      const res = await paymentsService.createRazorpayOrder({
        planType: selectedPlan.planType,
        billingPeriod: 'MONTHLY',
      });

      const orderData = res.data as any;

      // Check if wallet fully covered the amount
      if (orderData.orderId === 'WALLET_PAID') {
        toast.success('Plan upgraded successfully using Wallet Credits!');
        setLatestPaymentStatus('VERIFIED');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay. Please check your connection.');
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FleetTrack',
        description: `Upgrade to ${selectedPlan.planType} Plan`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            await paymentsService.verifyRazorpayPayment({
              ...response,
              planType: selectedPlan.planType,
              billingPeriod: 'MONTHLY',
            });
            toast.success('Payment successful! Plan upgraded.');
            setLatestPaymentStatus('VERIFIED');
            setTimeout(() => window.location.reload(), 1500);
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to verify payment'));
          }
        },
        theme: { color: '#0ea5e9' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to initialize payment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Subscription / Upgrade</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your active plan and upgrade by manual payment. Company Admin can only view
          plans and submit payment proof.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            View Current Plan
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {currentPlanLabel} Plan
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Vehicle Limit: {currentSubscription?.vehicleLimit ?? currentPlanMeta?.vehicleLimit ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Expires: {formatDate(currentSubscription?.currentPeriodEnd)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            View Payment Details
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-fleet-600" />
              UPI: {paymentSettings.upiId || 'business@okhdfcbank'}
            </p>
            <p className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-fleet-600" />
              A/C: {paymentSettings.bankAccountNumber || 'XXXXXXXX1234'}
            </p>
            <p className="text-xs text-slate-500">
              Verification is manual by Company Owner after statement check.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Check Payment Status
          </p>
          <div className="mt-3">
            {latestPaymentStatus === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active (Verified)
              </span>
            ) : latestPaymentStatus === 'PENDING' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Clock3 className="h-3.5 w-3.5" />
                Pending Verification
              </span>
            ) : latestPaymentStatus === 'REJECTED' ? (
              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                Rejected
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Not Paid Yet
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">View Available Plans</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-sm text-slate-400">Loading plans...</p>
          ) : (
            sortedPlans.map((plan) => {
              const active = selectedPlanType === plan.planType;
              return (
                <button
                  key={plan.planType}
                  type="button"
                  onClick={() => setSelectedPlanType(plan.planType)}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? 'border-fleet-500 bg-fleet-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{plan.planType}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatInr(plan.monthlyPriceInr)}/month
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {plan.vehicleLimit} vehicles
                  </p>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Upgrade Plan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Select higher plan, make payment manually, then click &quot;I Have Paid&quot; with transaction ID.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Current: <span className="font-semibold">{currentPlanLabel}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Selected: <span className="font-semibold">{selectedPlan?.planType ?? '—'}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Amount: <span className="font-semibold">{formatInr(selectedPlan?.monthlyPriceInr ?? 0)}</span>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleBuyPlan}
            disabled={submitting || !selectedPlan}
            className="rounded-lg bg-fleet-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600 disabled:opacity-60"
          >
            {submitting ? 'Processing...' : 'Buy via Razorpay'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold">Note</p>
        <p className="mt-1">
          All payments are non-refundable. Payment verification is manual and performed by
          the Company Owner after checking bank/UPI statement.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
        {paymentsHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No past payments found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Transaction ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsHistory.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(payment.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{payment.planType}</td>
                    <td className="px-4 py-3">{formatInr(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
                          payment.status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : payment.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{payment.transactionId || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
