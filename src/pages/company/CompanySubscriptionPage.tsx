import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { SubscriptionPaymentPanel } from '../../components/payments/SubscriptionPaymentPanel';
import { PlanDetailsModal } from '../../components/payments/PlanDetailsModal';
import { useAuth } from '../../context/AuthContext';
import {
  companiesService,
  type CompanyDetail,
} from '../../services/companies.service';
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
import { formatInr } from '../../utils/currency';

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

function planTitle(planType: string, plans: SubscriptionPlanRecord[]) {
  const meta = plans.find((p) => p.planType === planType);
  return meta?.displayName ?? planType;
}

/** Compare by monthly price so Monthly/Yearly toggle does not flip upgrade/downgrade. */
function planChangeKind(
  target: SubscriptionPlanRecord,
  current: SubscriptionPlanRecord | null | undefined,
): 'current' | 'upgrade' | 'downgrade' {
  if (!current || target.planType === current.planType) return 'current';
  if (target.monthlyPriceInr > current.monthlyPriceInr) return 'upgrade';
  if (target.monthlyPriceInr < current.monthlyPriceInr) return 'downgrade';
  // Same price, different plan — treat as upgrade/change toward higher vehicle limit
  if (target.vehicleLimit > current.vehicleLimit) return 'upgrade';
  if (target.vehicleLimit < current.vehicleLimit) return 'downgrade';
  return 'upgrade';
}

/** Savings vs paying monthly × 12 when yearly price is lower. */
function yearlySavingsPercent(plan: SubscriptionPlanRecord) {
  const monthlyYear = plan.monthlyPriceInr * 12;
  if (monthlyYear <= 0 || plan.yearlyPriceInr <= 0) return 0;
  if (plan.yearlyPriceInr >= monthlyYear) return 0;
  return Math.round(((monthlyYear - plan.yearlyPriceInr) / monthlyYear) * 100);
}

function yearlySavingsAmount(plan: SubscriptionPlanRecord) {
  const monthlyYear = plan.monthlyPriceInr * 12;
  if (monthlyYear <= 0 || plan.yearlyPriceInr <= 0) return 0;
  return Math.max(0, Math.round((monthlyYear - plan.yearlyPriceInr) * 100) / 100);
}

type PaymentStatus = 'NOT_PAID' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export function CompanySubscriptionPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionRecord | null>(
    null,
  );
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [latestPaymentStatus, setLatestPaymentStatus] = useState<PaymentStatus>('NOT_PAID');
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlanRecord | null>(null);
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
    if (!user?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.allSettled([
      companiesService.getById(user.companyId),
      subscriptionsService.list(),
      platformService.getPlans(),
      platformService.getPaymentSettings(),
      paymentsService.list(),
    ])
      .then(([companyResult, subsResult, plansResult, settingsResult, paymentsResult]) => {
        let companyData: CompanyDetail | null = null;
        if (companyResult.status === 'fulfilled') {
          companyData = (companyResult.value.data as CompanyDetail) ?? null;
          setCompany(companyData);
        }

        let activeSub: SubscriptionRecord | null = null;
        if (subsResult.status === 'fulfilled') {
          const list = subsResult.value.data ?? [];
          activeSub =
            list.find((s) => s.status === 'ACTIVE') ??
            list.find((s) => s.status === 'TRIAL') ??
            list[0] ??
            null;
          setCurrentSubscription(activeSub);
        }

        let planRows: SubscriptionPlanRecord[] = [];
        if (plansResult.status === 'fulfilled') {
          planRows = (plansResult.value.data as SubscriptionPlanRecord[]) ?? [];
          setPlans(planRows);
        }

        // Prefer company.planType (license / DB source of truth) over stale subscription
        const currentType =
          companyData?.planType ||
          companyData?.subscription?.planType ||
          activeSub?.planType ||
          '';
        setSelectedPlanType((prev) => {
          if (prev) return prev;
          const upgradeCandidate = planRows.find(
            (p) => p.planType !== currentType && p.monthlyPriceInr > 0,
          );
          return upgradeCandidate?.planType ?? planRows[0]?.planType ?? '';
        });

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
  }, [user?.companyId]);

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

  // Company document is source of truth (matches Mongo planType / vehicleLimit)
  const currentPlanType =
    company?.planType ||
    company?.subscription?.planType ||
    currentSubscription?.planType ||
    'FREE';

  const currentPlanMeta = plans.find((p) => p.planType === currentPlanType);
  const currentPlanName = planTitle(currentPlanType, plans);

  const vehicleLimit =
    company?.vehicleLimit ??
    company?.subscription?.vehicleLimit ??
    currentSubscription?.vehicleLimit ??
    currentPlanMeta?.vehicleLimit ??
    0;

  const currentForCompare: SubscriptionPlanRecord =
    currentPlanMeta ?? {
      planType: currentPlanType,
      displayName: currentPlanName,
      monthlyPriceInr: 0,
      yearlyPriceInr: 0,
      vehicleLimit,
    };

  const selectedChangeKind = selectedPlan
    ? planChangeKind(selectedPlan, currentForCompare)
    : 'current';

  const expiresAt =
    company?.licenseValidUntil ||
    company?.subscription?.currentPeriodEnd ||
    currentSubscription?.currentPeriodEnd;

  const hasManualPayDetails = Boolean(
    paymentSettings.upiId || paymentSettings.bankAccountNumber,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Plans priced higher than your current plan show Upgrade. Lower-priced plans show
          Downgrade. Pay with Razorpay (instant) or manual UPI / bank transfer.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-fleet-200 bg-gradient-to-br from-fleet-50 to-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-fleet-700">
              Current Plan
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              Active
            </span>
          </div>
          {loading ? (
            <p className="mt-3 text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-slate-900">{currentPlanName}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                {currentPlanType}
              </p>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt>Vehicle limit</dt>
                  <dd className="font-semibold text-slate-900">{vehicleLimit}</dd>
                </div>
                {company?.maxOwners != null ? (
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <dt>Max owners</dt>
                    <dd className="font-semibold text-slate-900">{company.maxOwners}</dd>
                  </div>
                ) : null}
                {company?.maxDrivers != null ? (
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <dt>Max drivers</dt>
                    <dd className="font-semibold text-slate-900">{company.maxDrivers}</dd>
                  </div>
                ) : null}
                {company?.maxAdmins != null ? (
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <dt>Sub-admin seats</dt>
                    <dd className="font-semibold text-slate-900">{company.maxAdmins}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt>Valid until</dt>
                  <dd className="font-semibold text-slate-900">{formatDate(expiresAt)}</dd>
                </div>
              </dl>
              {currentPlanMeta ? (
                <button
                  type="button"
                  onClick={() => setDetailPlan(currentPlanMeta)}
                  className="mt-4 w-full rounded-lg border border-fleet-200 bg-white px-3 py-2 text-sm font-semibold text-fleet-700 hover:bg-fleet-50"
                >
                  View full plan details
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Manual Payment Details
          </p>
          {hasManualPayDetails ? (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {paymentSettings.upiId ? (
                <p className="flex items-start gap-2">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-fleet-600" />
                  <span>
                    <span className="block text-xs text-slate-400">UPI ID</span>
                    {paymentSettings.upiId}
                  </span>
                </p>
              ) : null}
              {paymentSettings.bankAccountNumber ? (
                <p className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-fleet-600" />
                  <span>
                    <span className="block text-xs text-slate-400">Bank A/C</span>
                    {paymentSettings.bankAccountNumber}
                  </span>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Super Admin has not published UPI / bank details yet. You can still pay with
              Razorpay when available.
            </p>
          )}
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
              <div>
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  No upgrade payment yet
                </span>
                <p className="mt-2 text-xs text-slate-500">
                  License plan is active. Payments here appear after you upgrade.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Available Plans</h2>
            <p className="mt-1 text-sm text-slate-500">
              Higher price than current = Upgrade. Lower = Downgrade. Open View full plan
              for features and seats.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod('MONTHLY')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                billingPeriod === 'MONTHLY'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('YEARLY')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                billingPeriod === 'YEARLY'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              Yearly
              <span
                className={`ml-1.5 text-[10px] font-bold ${
                  billingPeriod === 'YEARLY' ? 'text-emerald-300' : 'text-emerald-600'
                }`}
              >
                Save
              </span>
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <p className="text-sm text-slate-400">Loading plans...</p>
          ) : (
            sortedPlans.map((plan) => {
              const isCurrent = plan.planType === currentPlanType;
              const isSelected = selectedPlanType === plan.planType;
              const changeKind = planChangeKind(plan, currentForCompare);
              const price =
                billingPeriod === 'YEARLY'
                  ? plan.yearlyPriceInr
                  : plan.monthlyPriceInr;
              const savePct = yearlySavingsPercent(plan);
              const saveAmt = yearlySavingsAmount(plan);
              const monthlyYearCost = plan.monthlyPriceInr * 12;
              const actionLabel =
                changeKind === 'current'
                  ? 'Current plan'
                  : changeKind === 'upgrade'
                    ? 'Upgrade'
                    : 'Downgrade';

              return (
                <div
                  key={plan.planType}
                  className={`relative flex flex-col rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? changeKind === 'downgrade'
                        ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400/25'
                        : changeKind === 'upgrade'
                          ? 'border-fleet-500 bg-fleet-50 ring-2 ring-fleet-500/25'
                          : 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/20'
                      : isCurrent
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPlanType(plan.planType)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900">
                        {plan.displayName ?? plan.planType}
                      </p>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {isCurrent ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                            Current
                          </span>
                        ) : changeKind === 'upgrade' ? (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                            Upgrade
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            Downgrade
                          </span>
                        )}
                        {isSelected && !isCurrent ? (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Selected
                          </span>
                        ) : null}
                        {billingPeriod === 'YEARLY' && savePct > 0 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            Save {savePct}%
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {billingPeriod === 'MONTHLY' ? (
                      <p className="mt-3 text-2xl font-bold text-slate-900">
                        {formatInr(price)}
                        <span className="text-sm font-medium text-slate-500">/month</span>
                      </p>
                    ) : (
                      <>
                        <p className="mt-3 text-2xl font-bold text-slate-900">
                          {formatInr(price)}
                          <span className="text-sm font-medium text-slate-500">/year</span>
                        </p>
                        {plan.monthlyPriceInr > 0 && monthlyYearCost > 0 ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {savePct > 0 ? (
                              <>
                                <span className="mr-1.5 text-slate-400 line-through">
                                  {formatInr(monthlyYearCost)}
                                </span>
                                vs 12 × monthly
                                <span className="ml-1 font-semibold text-emerald-600">
                                  · save {formatInr(saveAmt)} ({savePct}%)
                                </span>
                              </>
                            ) : (
                              <>Same as 12 × monthly ({formatInr(monthlyYearCost)})</>
                            )}
                          </p>
                        ) : null}
                        {plan.yearlyPriceInr > 0 ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            ≈ {formatInr(Math.round(plan.yearlyPriceInr / 12))}/month billed
                            yearly
                          </p>
                        ) : null}
                      </>
                    )}

                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      <li>
                        Up to{' '}
                        {plan.vehicleLimit >= 9999 ? 'unlimited' : plan.vehicleLimit}{' '}
                        vehicles
                      </li>
                      {plan.maxOwners != null ? (
                        <li>{plan.maxOwners} vehicle owners</li>
                      ) : null}
                      {plan.maxDrivers != null ? (
                        <li>{plan.maxDrivers} drivers</li>
                      ) : null}
                      {plan.features?.length ? (
                        <li className="text-slate-500">
                          {plan.features.length} feature
                          {plan.features.length === 1 ? '' : 's'} included
                        </li>
                      ) : null}
                    </ul>
                  </button>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      disabled={isCurrent}
                      onClick={() => setSelectedPlanType(plan.planType)}
                      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-default ${
                        isCurrent
                          ? 'bg-emerald-100 text-emerald-800'
                          : changeKind === 'downgrade'
                            ? isSelected
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : isSelected
                              ? 'bg-fleet-500 text-white hover:bg-fleet-600'
                              : 'border border-fleet-300 bg-fleet-50 text-fleet-800 hover:bg-fleet-100'
                      }`}
                    >
                      {isSelected && !isCurrent
                        ? changeKind === 'upgrade'
                          ? `Upgrade to ${plan.displayName ?? plan.planType}`
                          : `Downgrade to ${plan.displayName ?? plan.planType}`
                        : actionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanType(plan.planType);
                        setDetailPlan(plan);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    >
                      View full plan
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          {selectedChangeKind === 'downgrade'
            ? 'Downgrade & Pay'
            : selectedChangeKind === 'upgrade'
              ? 'Upgrade & Pay'
              : 'Change plan & Pay'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {selectedPlan
            ? selectedChangeKind === 'current'
              ? `“${planTitle(selectedPlan.planType, plans)}” is already your current plan. Pick a higher plan to upgrade or a lower plan to downgrade.`
              : selectedChangeKind === 'upgrade'
                ? `Upgrade to ${planTitle(selectedPlan.planType, plans)} (${billingPeriod === 'YEARLY' ? 'Yearly' : 'Monthly'}). Pay with Razorpay or submit manual proof.`
                : `Downgrade to ${planTitle(selectedPlan.planType, plans)} — confirm below. No Razorpay; unused value goes to your wallet.`
            : 'Select a plan above, then pay.'}
        </p>
        {selectedPlan && selectedChangeKind !== 'current' ? (
          <div
            className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
              selectedChangeKind === 'downgrade'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-sky-200 bg-sky-50 text-sky-900'
            }`}
          >
            <span>
              {selectedChangeKind === 'upgrade' ? 'Upgrade' : 'Downgrade'} ·{' '}
              {selectedPlan.vehicleLimit >= 9999
                ? 'Unlimited vehicles'
                : `${selectedPlan.vehicleLimit} vehicles`}
              {selectedPlan.maxOwners != null
                ? ` · ${selectedPlan.maxOwners} owners`
                : ''}
              {selectedPlan.maxDrivers != null
                ? ` · ${selectedPlan.maxDrivers} drivers`
                : ''}
            </span>
            <button
              type="button"
              onClick={() => setDetailPlan(selectedPlan)}
              className="font-semibold underline-offset-2 hover:underline"
            >
              View full plan
            </button>
          </div>
        ) : selectedPlan ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span>This is your active plan.</span>
            <button
              type="button"
              onClick={() => setDetailPlan(selectedPlan)}
              className="font-semibold text-fleet-700 hover:underline"
            >
              View full plan
            </button>
          </div>
        ) : null}
        <div className="mt-4">
          <SubscriptionPaymentPanel
            selectedPlan={
              selectedChangeKind === 'current' ? null : selectedPlan
            }
            paymentSettings={paymentSettings}
            billingPeriod={billingPeriod}
            changeKind={
              selectedChangeKind === 'current' ? undefined : selectedChangeKind
            }
            onSuccess={() => setTimeout(() => reload(), 800)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <p className="font-semibold">Note</p>
        <p className="mt-1">
          Razorpay payments activate after verification. Manual UPI / bank transfer stays
          pending until Super Admin verifies. All payments are non-refundable.
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
                        {payment.status === 'VERIFIED'
                          ? 'APPROVED'
                          : payment.status === 'PENDING'
                            ? 'PENDING VERIFICATION'
                            : payment.status}
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

      <PlanDetailsModal
        plan={detailPlan}
        billingPeriod={billingPeriod}
        isCurrent={detailPlan?.planType === currentPlanType}
        changeKind={
          detailPlan ? planChangeKind(detailPlan, currentForCompare) : undefined
        }
        onClose={() => setDetailPlan(null)}
        onSelect={
          detailPlan && detailPlan.planType !== currentPlanType
            ? () => setSelectedPlanType(detailPlan.planType)
            : undefined
        }
      />
    </div>
  );
}
