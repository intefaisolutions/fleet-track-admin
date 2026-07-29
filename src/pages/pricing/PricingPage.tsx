import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import { PlanFormModal } from '../../components/pricing/CreatePlanModal';
import {
  platformService,
  type SubscriptionPlanRecord,
} from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';
import { formatInr } from '../../utils/currency';

const PLAN_ORDER = ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;

function sortPlans(list: SubscriptionPlanRecord[]) {
  return [...list].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.planType as (typeof PLAN_ORDER)[number]);
    const bi = PLAN_ORDER.indexOf(b.planType as (typeof PLAN_ORDER)[number]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return (a.displayName || a.planType).localeCompare(b.displayName || b.planType);
  });
}

function formatRetention(days?: number) {
  if (!days) return '—';
  if (days >= 365) return `${days} days (1 year+)`;
  return `${days} days`;
}

function formatVehicles(limit: number) {
  if (limit >= 9999) return 'Unlimited';
  return `${limit} vehicles`;
}

export function PricingPage() {
  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlanRecord | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    platformService
      .getPricingOverview()
      .then((res) => {
        const list = (res.data?.plans ?? []) as SubscriptionPlanRecord[];
        setPlans(sortPlans(list));
      })
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load pricing')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedPlans = useMemo(() => sortPlans(plans), [plans]);

  const toggleStatus = async (plan: SubscriptionPlanRecord) => {
    const next = plan.isActive === false;
    setBusyPlan(plan.planType);
    try {
      await platformService.setPlanStatus(plan.planType, next);
      toast.success(
        next
          ? `${plan.displayName || plan.planType} enabled`
          : `${plan.displayName || plan.planType} disabled for new subscriptions`,
      );
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update plan status'));
    } finally {
      setBusyPlan(null);
    }
  };

  const handleDelete = async (plan: SubscriptionPlanRecord) => {
    if (plan.isSystem) {
      toast.error('System plans cannot be deleted. Disable them instead.');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete plan?',
      text: `Delete "${plan.displayName || plan.planType}"? This is blocked if any company still uses it.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;

    setBusyPlan(plan.planType);
    try {
      await platformService.deletePlan(plan.planType);
      toast.success('Plan deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete plan'));
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="mt-2 max-w-4xl text-sm text-slate-600">
            Manage plans dynamically from the database — create, update, enable/disable, or delete.
            Price and catalog changes apply to new subscribers only; existing companies keep their
            current subscription.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-fleet-600"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          Loading subscription plans...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[1100px] w-full border-collapse">
              <thead className="bg-[#2f75b5] text-white">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Plan Name</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Monthly</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Yearly</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Vehicles</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Data Retention</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Support</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Features</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-400">
                      No plans found. Create your first plan.
                    </td>
                  </tr>
                ) : (
                  sortedPlans.map((plan) => {
                    const active = plan.isActive !== false;
                    const busy = busyPlan === plan.planType;
                    return (
                      <tr
                        key={plan.planType}
                        className={`border-b border-slate-200 ${active ? '' : 'bg-slate-50 opacity-80'}`}
                      >
                        <td className="px-3 py-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {plan.displayName || plan.planType}
                          </p>
                          <p className="font-mono text-xs text-slate-400">{plan.planType}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {formatInr(plan.monthlyPriceInr)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {formatInr(plan.yearlyPriceInr)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {formatVehicles(plan.vehicleLimit)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {formatRetention(plan.dataRetentionDays)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {(plan.supportType || '—')
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-xs text-slate-600">
                          {plan.features?.length ? plan.features.join(', ') : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Edit"
                              disabled={busy}
                              onClick={() => setEditing(plan)}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={active ? 'Disable' : 'Enable'}
                              disabled={busy}
                              onClick={() => toggleStatus(plan)}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={
                                plan.isSystem
                                  ? 'System plans cannot be deleted'
                                  : 'Delete'
                              }
                              disabled={busy || !!plan.isSystem}
                              onClick={() => handleDelete(plan)}
                              className="rounded-md border border-slate-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Catalog changes never migrate existing companies off their plan. Disable a plan to
              hide it from new upgrades; delete only unused custom plans.
            </p>
          </div>
        </div>
      )}

      <PlanFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSuccess={load}
      />
      <PlanFormModal
        open={!!editing}
        mode="edit"
        plan={editing}
        onClose={() => setEditing(null)}
        onSuccess={load}
      />
    </div>
  );
}
