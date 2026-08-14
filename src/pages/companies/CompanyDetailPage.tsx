import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  companiesService,
  type CompanyDetailPayload,
} from '../../services/companies.service';
import { ROUTES } from '../../config/constants';
import { formatInr } from '../../utils/currency';
import { copyToClipboard } from '../../utils/clipboard';
import { getApiErrorMessage } from '../../utils/validation';
import { expenseCategoryLabel } from '../../config/expenseCategories';

type TabId = 'overview' | 'vehicles' | 'drivers' | 'expenses' | 'billing' | 'users';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'billing', label: 'Plan & Payments' },
  { id: 'users', label: 'Users' },
];

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN');
}

function idOf(ref: unknown): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    return String((ref as { _id: unknown })._id);
  }
  return '';
}

function labelOf(ref: unknown, fallback = '—'): string {
  if (!ref) return fallback;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && ref !== null) {
    const o = ref as Record<string, unknown>;
    if (typeof o.registrationNumber === 'string') return o.registrationNumber;
    if (typeof o.fullName === 'string') return o.fullName;
    if (typeof o.email === 'string') return o.email;
  }
  return fallback;
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CompanyDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    companiesService
      .getDetail(id)
      .then((res) => setData(res.data ?? null))
      .catch((err: unknown) => {
        toast.error(getApiErrorMessage(err, 'Failed to load company details'));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = data?.stats;
  const sub = data?.subscription;

  const expenseTotal = useMemo(() => {
    if (stats?.expenseTotal != null) return Number(stats.expenseTotal);
    return (data?.expenses ?? []).reduce(
      (s, e) => s + Number((e as { amount?: number }).amount ?? 0),
      0,
    );
  }, [data?.expenses, stats?.expenseTotal]);

  const tabCounts = useMemo(() => {
    if (!data) {
      return {
        vehicles: 0,
        drivers: 0,
        expenses: 0,
        payments: 0,
        users: 0,
      };
    }
    return {
      vehicles: stats?.vehicleCount ?? data.vehicles?.length ?? 0,
      drivers: stats?.driverCount ?? data.drivers?.length ?? 0,
      expenses: stats?.expenseCount ?? data.expenses?.length ?? 0,
      payments: data.payments?.length ?? 0,
      users: data.users?.length ?? 0,
    };
  }, [data, stats]);

  const tabsWithCounts = useMemo(
    () =>
      TABS.map((t) => {
        if (t.id === 'overview') return t;
        if (t.id === 'vehicles') return { ...t, label: `Vehicles (${tabCounts.vehicles})` };
        if (t.id === 'drivers') return { ...t, label: `Drivers (${tabCounts.drivers})` };
        if (t.id === 'expenses') return { ...t, label: `Expenses (${tabCounts.expenses})` };
        if (t.id === 'billing')
          return { ...t, label: `Plan & Payments (${tabCounts.payments})` };
        if (t.id === 'users') return { ...t, label: `Users (${tabCounts.users})` };
        return t;
      }),
    [tabCounts],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading company details...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(ROUTES.COMPANIES)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to companies
        </button>
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          Company not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={ROUTES.COMPANIES}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Client Companies
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {data.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                data.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : data.status === 'SUSPENDED'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {data.status ?? '—'}
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
              {data.planType ?? sub?.planType ?? 'FREE'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Full company profile, plan, fleet, drivers, and expenses
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Vehicles',
            value: String(stats?.vehicleCount ?? data.vehicles?.length ?? 0),
            icon: Truck,
          },
          {
            label: 'Drivers',
            value: String(stats?.driverCount ?? data.drivers?.length ?? 0),
            icon: Users,
          },
          {
            label: 'Expenses',
            value: formatInr(expenseTotal),
            icon: Receipt,
            sub: `${stats?.expenseCount ?? data.expenses?.length ?? 0} records`,
          },
          {
            label: 'Wallet',
            value: formatInr(Number(data.walletBalance ?? 0)),
            icon: Wallet,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {s.label}
              </p>
              <s.icon className="h-4 w-4 text-fleet-500" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">{s.value}</p>
            {s.sub ? <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p> : null}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabsWithCounts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-white text-fleet-700 shadow-sm ring-1 ring-slate-200 ring-b-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 className="h-4 w-4 text-fleet-500" />
                Company profile
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-400">Email</dt>
                    <dd className="font-medium text-slate-800">{data.email}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-400">Phone</dt>
                    <dd className="font-medium text-slate-800">{data.phone || '—'}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <dt className="text-xs text-slate-400">Address</dt>
                    <dd className="font-medium text-slate-800">
                      {[data.address, data.city, data.country].filter(Boolean).join(', ') ||
                        '—'}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3 pl-7">
                  <div>
                    <dt className="text-xs text-slate-400">Registered</dt>
                    <dd className="font-medium text-slate-800">
                      {formatDate(data.createdAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3 pl-7">
                  <div>
                    <dt className="text-xs text-slate-400">License key</dt>
                    <dd className="font-mono text-xs font-medium text-slate-800">
                      {data.licenseKey || '—'}
                    </dd>
                    {data.licenseKey ? (
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            const ok = await copyToClipboard(data.licenseKey!);
                            if (ok) toast.success('License key copied');
                            else toast.error('Could not copy license key');
                          })();
                        }}
                        className="mt-1 text-xs font-medium text-fleet-600 hover:underline"
                      >
                        Copy key
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-3 pl-7">
                  <div>
                    <dt className="text-xs text-slate-400">License / plan valid until</dt>
                    <dd className="font-medium text-slate-800">
                      {formatDate(data.licenseValidUntil)}
                    </dd>
                  </div>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <CreditCard className="h-4 w-4 text-fleet-500" />
                Current plan
              </h2>
              {sub ? (
                <dl className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Plan</dt>
                    <dd className="font-bold text-slate-900">
                      {sub.planType ?? data.planType ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Billing</dt>
                    <dd className="font-semibold text-slate-800">
                      {sub.billingPeriod ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Started (purchase)</dt>
                    <dd className="font-medium text-slate-800">
                      {formatDate(sub.startDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Valid until</dt>
                    <dd className="font-medium text-slate-800">
                      {formatDate(sub.currentPeriodEnd)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Amount paid</dt>
                    <dd className="font-semibold text-emerald-700">
                      {formatInr(Number(sub.amountPaid ?? sub.originalPrice ?? 0))}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Vehicle limit</dt>
                    <dd className="font-medium text-slate-800">
                      {sub.vehicleLimit ?? data.vehicleLimit ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Status</dt>
                    <dd className="font-medium text-slate-800">{sub.status ?? '—'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No subscription record found. Plan type on company:{' '}
                  <strong>{data.planType ?? 'FREE'}</strong>
                </p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 px-2 py-3">
                  <p className="font-bold text-slate-900">{stats?.adminCount ?? 0}</p>
                  <p className="text-slate-500">Sub-Admins</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-3">
                  <p className="font-bold text-slate-900">{stats?.ownerCount ?? 0}</p>
                  <p className="text-slate-500">Owners</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-3">
                  <p className="font-bold text-slate-900">{stats?.driverCount ?? 0}</p>
                  <p className="text-slate-500">Drivers</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === 'vehicles' && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Registration</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Fuel</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data.vehicles ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                      No vehicles created yet.
                    </td>
                  </tr>
                ) : (
                  data.vehicles.map((v) => (
                    <tr key={idOf(v._id) || String(v.registrationNumber)}>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {String(v.registrationNumber ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {[v.make, v.modelName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {String(v.fuelType ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {labelOf(v.ownerId)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {labelOf(v.assignedDriverId, 'Unassigned')}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {String(v.status ?? '—')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'drivers' && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">License</th>
                  <th className="px-3 py-2">Login email</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data.drivers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      No drivers created yet.
                    </td>
                  </tr>
                ) : (
                  data.drivers.map((d) => (
                    <tr key={idOf(d._id)}>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {String(d.fullName ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {String(d.phone ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                        {String(d.licenseNumber ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {typeof d.userId === 'object' && d.userId
                          ? String((d.userId as { email?: string }).email ?? '—')
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {String(d.status ?? '—')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="overflow-x-auto">
            <div className="mb-3 flex justify-between text-sm">
              <p className="text-slate-500">
                Showing {(data.expenses ?? []).length} recent expenses
              </p>
              <p className="font-semibold text-slate-900">
                Total: {formatInr(expenseTotal)}
              </p>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data.expenses ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      No expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.expenses.map((e) => (
                    <tr key={idOf(e._id)}>
                      <td className="px-3 py-2.5 text-slate-600">
                        {formatDate(
                          String(e.expenseDate ?? e.createdAt ?? ''),
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {labelOf(e.vehicleId)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {expenseCategoryLabel(String(e.category ?? ''))}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {formatInr(Number(e.amount ?? 0))}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {labelOf(e.recordedBy)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'billing' && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Plan purchased</h3>
              {sub ? (
                <p className="mt-2 text-sm text-slate-600">
                  <strong className="text-slate-900">
                    {sub.planType ?? data.planType}
                  </strong>{' '}
                  · {sub.billingPeriod ?? '—'} billing · started{' '}
                  {formatDate(sub.startDate)} · valid until{' '}
                  {formatDate(sub.currentPeriodEnd)} · paid{' '}
                  {formatInr(Number(sub.amountPaid ?? sub.originalPrice ?? 0))}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No paid subscription history on file. Current plan label:{' '}
                  {data.planType ?? 'FREE'}
                </p>
              )}
            </section>

            <div className="overflow-x-auto">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Payment history</h3>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">TXN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data.payments ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                        No payments yet.
                      </td>
                    </tr>
                  ) : (
                    data.payments.map((p) => (
                      <tr key={idOf(p._id)}>
                        <td className="px-3 py-2.5 text-slate-600">
                          {formatDateTime(String(p.createdAt ?? ''))}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {String(p.planType ?? '—')}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {String(p.billingPeriod ?? '—')}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">
                          {formatInr(Number(p.amount ?? 0))}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">
                          {String(p.paymentMethod ?? p.paymentGateway ?? '—')}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : p.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {String(p.status ?? '—')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                          {String(p.transactionId ?? '—')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data.users ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                      No users found. Vehicle Owners and Drivers will appear here.
                    Company Admin is not listed as a fleet user.
                    </td>
                  </tr>
                ) : (
                  data.users.map((u) => (
                    <tr key={idOf(u._id)}>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {String(u.fullName ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {String(u.email ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {String(u.phone ?? '—')}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {String(u.role ?? '—')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {String(u.status ?? '—')}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatDate(String(u.createdAt ?? ''))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
