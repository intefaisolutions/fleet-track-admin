import { Check, X } from 'lucide-react';
import { ModalPanel } from '../ui/ModalPanel';
import type { SubscriptionPlanRecord } from '../../services/platform.service';
import { formatInr } from '../../utils/currency';

function formatVehicles(limit: number) {
  if (limit >= 9999) return 'Unlimited';
  return String(limit);
}

function formatRetention(days?: number) {
  if (!days) return '—';
  if (days >= 365) return `${days} days (1 year+)`;
  return `${days} days`;
}

export function PlanDetailsModal({
  plan,
  billingPeriod,
  isCurrent,
  changeKind,
  onClose,
  onSelect,
}: {
  plan: SubscriptionPlanRecord | null;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  isCurrent?: boolean;
  changeKind?: 'upgrade' | 'downgrade' | 'current';
  onClose: () => void;
  onSelect?: () => void;
}) {
  if (!plan) return null;

  const price =
    billingPeriod === 'YEARLY' ? plan.yearlyPriceInr : plan.monthlyPriceInr;
  const features = (plan.features ?? []).map((f) => f.trim()).filter(Boolean);
  const support = (plan.supportType || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <ModalPanel maxWidth="max-w-lg" className="z-50">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Full plan details
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {plan.displayName ?? plan.planType}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-slate-400">{plan.planType}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(70dvh,32rem)] space-y-5 overflow-y-auto px-6 py-5">
          {isCurrent ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              Your current plan
            </span>
          ) : changeKind === 'downgrade' ? (
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Downgrade from current plan
            </span>
          ) : changeKind === 'upgrade' ? (
            <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
              Upgrade from current plan
            </span>
          ) : null}

          {plan.description ? (
            <p className="text-sm leading-relaxed text-slate-600">{plan.description}</p>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pricing
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatInr(price)}
              <span className="text-sm font-medium text-slate-500">
                /{billingPeriod === 'YEARLY' ? 'year' : 'month'}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Monthly: {formatInr(plan.monthlyPriceInr)}</span>
              <span>Yearly: {formatInr(plan.yearlyPriceInr)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Limits & seats
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <dt className="text-xs text-slate-400">Vehicles</dt>
                <dd className="font-semibold text-slate-900">
                  {formatVehicles(plan.vehicleLimit)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <dt className="text-xs text-slate-400">Sub-admins</dt>
                <dd className="font-semibold text-slate-900">
                  {plan.maxAdmins ?? '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <dt className="text-xs text-slate-400">Owners</dt>
                <dd className="font-semibold text-slate-900">
                  {plan.maxOwners ?? '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <dt className="text-xs text-slate-400">Drivers</dt>
                <dd className="font-semibold text-slate-900">
                  {plan.maxDrivers ?? '—'}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <dt className="text-xs text-slate-400">Data retention</dt>
                <dd className="font-semibold text-slate-900">
                  {formatRetention(plan.dataRetentionDays)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <dt className="text-xs text-slate-400">Support</dt>
                <dd className="font-semibold text-slate-900">
                  {support.length ? support.join(' · ') : '—'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Features included
            </p>
            {features.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No feature list published for this plan yet.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
          >
            Close
          </button>
          {onSelect && !isCurrent ? (
            <button
              type="button"
              onClick={() => {
                onSelect();
                onClose();
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                changeKind === 'downgrade'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-fleet-500 hover:bg-fleet-600'
              }`}
            >
              {changeKind === 'downgrade'
                ? 'Select to downgrade'
                : 'Select to upgrade'}
            </button>
          ) : null}
        </div>
      </ModalPanel>
    </>
  );
}
