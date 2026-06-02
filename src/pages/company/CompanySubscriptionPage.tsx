import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, Clock3, CreditCard, Wallet } from 'lucide-react';
import { subscriptionsService, type SubscriptionRecord } from '../../services/subscriptions.service';
import {
  platformService,
  type PaymentSettingsRecord,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { paymentsService, type PaymentRecord } from '../../services/payments.service';
import { reportsService } from '../../services/reports.service';
import { getApiErrorMessage } from '../../utils/validation';

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function planLabel(plan: SubscriptionPlanRecord) {
  return plan.displayName?.trim() || plan.planType;
}

type PaymentStatus = 'NOT_PAID' | 'PENDING' | 'VERIFIED' | 'REJECTED';

function resolvePaymentStatus(rows: PaymentRecord[]): PaymentStatus {
  const latest = rows[0]?.status?.toUpperCase();
  if (latest === 'VERIFIED') return 'VERIFIED';
  if (latest === 'PENDING') return 'PENDING';
  if (latest === 'REJECTED') return 'REJECTED';
  return 'NOT_PAID';
}

export function CompanySubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionRecord | null>(
    null,
  );
  const [dashboardPlanType, setDashboardPlanType] = useState<string | null>(null);
  const [dashboardExpiresAt, setDashboardExpiresAt] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsRecord>({});
  const [latestPaymentStatus, setLatestPaymentStatus] = useState<PaymentStatus>('NOT_PAID');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      subscriptionsService.list(),
      platformService.getPlans(),
      platformService.getPaymentSettings(),
      paymentsService.list(),
      reportsService.getCompanyDashboard(),
    ])
      .then(([subsRes, plansRes, settingsRes, paymentsRes, dashboardRes]) => {
        const list = subsRes.data ?? [];
        const active =
          list.find((s) => s.status === 'ACTIVE') ??
          list.find((s) => s.status === 'TRIAL') ??
          list[0] ??
          null;
        setCurrentSubscription(active);

        const planRows = (plansRes.data as SubscriptionPlanRecord[]) ?? [];
        setPlans(planRows);

        setPaymentSettings(settingsRes.data ?? {});

        const paymentRows = paymentsRes.data ?? [];
        setLatestPaymentStatus(resolvePaymentStatus(paymentRows));

        const dash = dashboardRes.data;
        if (dash?.subscription) {
          setDashboardPlanType(dash.subscription.planType ?? null);
          setDashboardExpiresAt(dash.subscription.expiresAt ?? null);
        }
      })
      .catch((err: unknown) => {
        toast.error(getApiErrorMessage(err, 'Failed to load subscription data'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.monthlyPriceInr - b.monthlyPriceInr),
    [plans],
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.planType === selectedPlanType) ?? null,
    [plans, selectedPlanType],
  );

  const currentPlanType =
    currentSubscription?.planType ?? dashboardPlanType ?? 'FREE';
  const currentPlanMeta = plans.find((p) => p.planType === currentPlanType);
  const currentPlanDisplay =
    currentPlanMeta?.displayName?.trim() || currentPlanType;

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
      setTransactionId('');
      load();
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
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading...</p>
          ) : (
            <>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {currentPlanDisplay} Plan
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Vehicle Limit:{' '}
                {currentSubscription?.vehicleLimit ??
                  currentPlanMeta?.vehicleLimit ??
                  0}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Expires:{' '}
                {formatDate(
                  currentSubscription?.currentPeriodEnd ?? dashboardExpiresAt,
                )}
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            View Payment Details
          </p>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-fleet-600" />
                UPI: {paymentSettings.upiId?.trim() || '—'}
              </p>
              <p className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-fleet-600" />
                A/C: {paymentSettings.bankAccountNumber?.trim() || '—'}
              </p>
              {paymentSettings.ifscCode?.trim() && (
                <p className="text-slate-600">IFSC: {paymentSettings.ifscCode}</p>
              )}
              {paymentSettings.accountHolderName?.trim() && (
                <p className="text-slate-600">
                  Account name: {paymentSettings.accountHolderName}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Verification is manual by Company Owner after statement check.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Check Payment Status
          </p>
          <div className="mt-3">
            {loading ? (
              <p className="text-sm text-slate-400">Loading...</p>
            ) : latestPaymentStatus === 'VERIFIED' ? (
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
          ) : sortedPlans.length === 0 ? (
            <p className="text-sm text-slate-400">No plans available.</p>
          ) : (
            sortedPlans.map((plan) => {
              const active = selectedPlanType === plan.planType;
              const isCurrent = plan.planType === currentPlanType;
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {planLabel(plan)}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
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
            Current: <span className="font-semibold">{currentPlanDisplay}</span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Selected:{' '}
            <span className="font-semibold">
              {selectedPlan ? planLabel(selectedPlan) : '—'}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Amount:{' '}
            <span className="font-semibold">
              {formatInr(selectedPlan?.monthlyPriceInr ?? 0)}
            </span>
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
            disabled={submitting || loading}
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
