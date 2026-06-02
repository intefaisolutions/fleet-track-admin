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

export function CompanySubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionRecord | null>(
    null,
  );
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [latestPaymentStatus, setLatestPaymentStatus] = useState<PaymentStatus>('NOT_PAID');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
          const rows = (paymentsResult.value.data as Array<{ status?: string }>) ?? [];
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

  const handleMarkAsPaid = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }
    if (!transactionId.trim()) {
      toast.error('Please enter transaction ID');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.submit({
        planType: selectedPlan.planType,
        amount: selectedPlan.monthlyPriceInr,
        transactionId: transactionId.trim(),
      });
      toast.success('Payment submitted. Waiting for manual verification.');
      setLatestPaymentStatus('PENDING');
      setTransactionId('');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to submit payment'));
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

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter transaction ID (e.g. TXN123456789)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
          />
          <button
            type="button"
            onClick={handleMarkAsPaid}
            disabled={submitting}
            className="rounded-lg bg-fleet-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'I Have Paid'}
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
    </div>
  );
}
