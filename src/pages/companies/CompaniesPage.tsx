import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Ban,
  Building2,
  CheckCircle2,
  Mail,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react';
import { companiesService } from '../../services/companies.service';
import type { Company } from '../../types/api';
import { getApiErrorMessage } from '../../utils/validation';

const PLAN_OPTIONS = ['', 'FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;

const PLAN_BADGE: Record<string, string> = {
  ENTERPRISE: 'bg-violet-100 text-violet-800',
  PREMIUM: 'bg-amber-100 text-amber-800',
  STANDARD: 'bg-sky-100 text-sky-800',
  BASIC: 'bg-slate-100 text-slate-700',
  FREE: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PlanBadge({ plan }: { plan?: string }) {
  const key = (plan ?? 'FREE').toUpperCase();
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${PLAN_BADGE[key] ?? PLAN_BADGE.FREE}`}
    >
      {key}
    </span>
  );
}

function CompanyCard({
  company,
  onSuspend,
  onActivate,
  onDelete,
  suspending,
  activating,
  deleting,
}: {
  company: Company;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  suspending: boolean;
  activating: boolean;
  deleting: boolean;
}) {
  const isSuspended = company.status === 'SUSPENDED';
  const canSuspend = company.status === 'ACTIVE' || company.status === 'PENDING';

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Building2 className="h-5 w-5" />
        </div>
        <PlanBadge plan={company.planType} />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900">{company.name}</h2>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
        <Mail className="h-3.5 w-3.5 shrink-0" />
        {company.email}
      </p>

      <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-600">
        <Truck className="h-4 w-4 text-slate-400" />
        <span className="font-medium text-slate-800">{company.vehicleCount ?? 0}</span>
        <span className="text-slate-400">vehicles</span>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Registered
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-700">
          {formatDate(company.createdAt)}
        </p>
      </div>

      {isSuspended && (
        <p className="mt-2 text-xs font-medium text-amber-700">Suspended</p>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
        {isSuspended ? (
          <button
            type="button"
            disabled={activating}
            onClick={() => onActivate(company._id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4" />
            {activating ? 'Reactivating...' : 'Reactivate'}
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSuspend || suspending}
            onClick={() => onSuspend(company._id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Ban className="h-4 w-4" />
            {suspending ? 'Suspending...' : 'Suspend'}
          </button>
        )}
        <button
          type="button"
          disabled={deleting}
          onClick={() => onDelete(company._id)}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </article>
  );
}

export function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'delete' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    companiesService
      .getAll()
      .then((r) => setCompanies((r.data ?? []) as Company[]))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load companies')),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchesPlan =
        !planFilter || (c.planType ?? 'FREE').toUpperCase() === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [companies, search, planFilter]);

  const handleReset = () => {
    setSearch('');
    setPlanFilter('');
  };

  const handleSuspend = async (id: string) => {
    const company = companies.find((c) => c._id === id);
    if (!company) return;
    if (!window.confirm(`Suspend "${company.name}"? Users will lose access until reactivated.`)) {
      return;
    }
    setActionId(id);
    setActionType('suspend');
    try {
      await companiesService.suspend(id);
      toast.success('Company suspended');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to suspend company'));
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleDelete = async (id: string) => {
    const company = companies.find((c) => c._id === id);
    if (!company) return;
    if (
      !window.confirm(
        `Delete "${company.name}" permanently? This cannot be undone.`,
      )
    ) {
      return;
    }
    setActionId(id);
    setActionType('delete');
    try {
      await companiesService.delete(id);
      toast.success('Company deleted');
      setCompanies((prev) => prev.filter((c) => c._id !== id));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete company'));
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleActivate = async (id: string) => {
    const company = companies.find((c) => c._id === id);
    if (!company) return;
    if (!window.confirm(`Reactivate "${company.name}"? Company access will be restored.`)) {
      return;
    }
    setActionId(id);
    setActionType('activate');
    try {
      await companiesService.activate(id);
      toast.success('Company reactivated');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to reactivate company'));
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Client Companies</h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="text-slate-400">FleetOps</span>
          <span className="mx-1.5 text-slate-300">/</span>
          Companies
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-fleet-500"
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.filter(Boolean).map((plan) => (
            <option key={plan} value={plan}>
              {plan.charAt(0) + plan.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          Loading companies...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-slate-500">
            {companies.length === 0
              ? 'No companies yet. Clients register using a license key.'
              : 'No companies match your filters.'}
          </p>
          {companies.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-2 text-sm font-medium text-fleet-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((company) => (
            <CompanyCard
              key={company._id}
              company={company}
              onSuspend={handleSuspend}
              onActivate={handleActivate}
              onDelete={handleDelete}
              suspending={actionId === company._id && actionType === 'suspend'}
              activating={actionId === company._id && actionType === 'activate'}
              deleting={actionId === company._id && actionType === 'delete'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
