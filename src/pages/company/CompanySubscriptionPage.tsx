import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, Clock3, CreditCard, Wallet } from 'lucide-react';
import { SubscriptionPaymentPanel } from '../../components/payments/SubscriptionPaymentPanel';
import {
  subscriptionsService,
  type SubscriptionRecord,
} from '../../services/subscriptions.service';
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
  const [loading, setLoading] = useState(true);
  const [paymentsHistory, setPaymentsHistory] = useState<
    Array<{
      _id: string;
      createdAt?: string;
      planType?: string;
      amount: number;
      status: string;
      transactionId?: string;
      paymentMethod?: string;
      paymentGateway?: string;
    }>
  >([]);

  const reload = useCallback(() => {
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
          const rows =
            (paymentsResult.value.data as typeof paymentsHistory) ?? [];
          setPaymentsHistory(rows);
          const latest = rows[0]?.status?.toUpperCase();
          if (latest === 'VERIFIED') setLatestPaymentStatus('VERIFIED');
          else if (latest === 'PENDING') setLatestPaymentStatus('PENDING');
          else if (latest === 'REJECTED') setLatestPaymentStatus('REJECTED');
          else setLatestPaymentStatus('NOT_PAID');
        }
      })
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load subscription')),
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

  const currentPlanLabel = currentSubscription?.planType ?? 'FREE';
  const currentPlanMeta = plans.find((p) => p.planType === currentPlanLabel);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Subscription / Upgrade</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upgrade with Razorpay (instant) or Manual UPI / Bank Transfer (pending Super Admin
          verification). Existing manual payment flow is unchanged.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Plan
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900">{currentPlanLabel} Plan</p>
          <p className="mt-1 text-sm text-slate-600">
            Vehicle Limit:{' '}
            {currentSubscription?.vehicleLimit ?? currentPlanMeta?.vehicleLimit ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Expires: {formatDate(currentSubscription?.currentPeriodEnd)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Manual Payment Details
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-fleet-600" />
              UPI: {paymentSettings.upiId || '—'}
            </p>
            <p className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-fleet-600" />
              A/C: {paymentSettings.bankAccountNumber || '—'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Latest Payment Status
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
        <h2 className="text-lg font-bold text-slate-900">Available Plans</h2>
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
                  <p className="text-sm font-semibold text-slate-900">
                    {plan.displayName ?? plan.planType}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatInr(plan.monthlyPriceInr)}/month
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{plan.vehicleLimit} vehicles</p>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Upgrade & Pay</h2>
        <p className="mt-2 text-sm text-slate-500">
          Select a plan above, choose Razorpay / Manual UPI / Bank Transfer, then pay.
        </p>
        <div className="mt-4">
          <SubscriptionPaymentPanel
            selectedPlan={selectedPlan}
            paymentSettings={paymentSettings}
            onSuccess={() => setTimeout(() => reload(), 800)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold">Note</p>
        <p className="mt-1">
          Razorpay payments auto-activate after signature verification. Manual UPI / Bank
          Transfer stay pending until Super Admin verifies. All payments are non-refundable.
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
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Payment / TXN ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsHistory.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {payment.planType}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {payment.paymentMethod || payment.paymentGateway || '—'}
                    </td>
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
                    <td className="px-4 py-3 font-mono text-xs">
                      {payment.transactionId || '—'}
                    </td>
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
