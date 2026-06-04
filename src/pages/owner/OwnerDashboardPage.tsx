import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  CreditCard,
  Gauge,
  Receipt,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../config/constants';
import { OwnerMetricCard } from '../../components/owner/OwnerMetricCard';
import { reportsService, type CompanyDashboardData } from '../../services/reports.service';
import { expenseCategoryLabel } from '../../config/expenseCategories';
import { getApiErrorMessage } from '../../utils/validation';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsService
      .getOwnerDashboard()
      .then((res) => setData(res.data ?? null))
      .catch((err: unknown) => {
        setData(null);
        toast.error(getApiErrorMessage(err, 'Failed to load dashboard'));
      })
      .finally(() => setLoading(false));
  }, []);

  const recentExpenses = useMemo(
    () => data?.recentOwnerExpenses ?? [],
    [data?.recentOwnerExpenses],
  );

  const used = data?.totalVehicles ?? 0;
  const limit = data?.myVehiclesLimit ?? 0;
  const atLimit = limit > 0 && used >= limit;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-fleet-900 px-6 py-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-fleet-200">
              Vehicle Owner Portal
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Welcome back, {user?.fullName?.split(' ')[0] ?? 'Owner'}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Your personalized overview — only your vehicles, drivers, and expenses.
            </p>
          </div>
          {atLimit && (
            <Link
              to={ROUTES.OWNER_UPGRADE}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Plan
            </Link>
          )}
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-fleet-500/20 blur-2xl" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OwnerMetricCard
          label="My Vehicles"
          value={loading ? '—' : String(used)}
          hint={
            limit
              ? `${data?.subscription.planLabel ?? 'Plan'}: ${used}/${limit} used`
              : 'Registered in your account'
          }
          icon={<Car className="h-5 w-5" />}
          iconClass="bg-sky-100 text-sky-600"
          badge={
            atLimit ? (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Limit reached
              </span>
            ) : undefined
          }
        />
        <OwnerMetricCard
          label="Total Expenses (This Month)"
          value={loading ? '—' : formatInr(data?.expensesThisMonth ?? 0)}
          hint="Across all your vehicles"
          icon={<Receipt className="h-5 w-5" />}
          iconClass="bg-emerald-100 text-emerald-600"
        />
        <OwnerMetricCard
          label="Plan Status"
          value={data?.subscription.planLabel ?? 'Free Plan'}
          hint={`${limit || '—'} vehicles max`}
          icon={<CreditCard className="h-5 w-5" />}
          iconClass="bg-violet-100 text-violet-600"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fleet-500" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Most Expensive Vehicle
            </p>
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">
            {data?.mostExpensiveVehicle?.label ?? '—'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {data?.mostExpensiveVehicle
              ? formatInr(data.mostExpensiveVehicle.amount)
              : 'No expense records yet'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Upcoming Services
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {(data?.upcomingServices?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400">No upcoming services</p>
            ) : (
              data?.upcomingServices?.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {s.label.replace('-', ' – ')}
                  </p>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Due in {s.dueInKm} km
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Recent Expenses</p>
            <p className="text-xs text-slate-500">Latest entries across your fleet</p>
          </div>
          <Link
            to={ROUTES.OWNER_EXPENSES}
            className="inline-flex items-center gap-1 text-xs font-semibold text-fleet-600 hover:text-fleet-700"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100 px-5">
          {recentExpenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No recent expenses.</p>
          ) : (
            recentExpenses.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <p className="text-sm text-slate-800">
                  <span className="font-semibold">{expenseCategoryLabel(e.category)}</span>{' '}
                  {formatInr(Number(e.amount || 0))} on{' '}
                  <span className="font-medium">{e.registrationNumber}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(e.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            to: ROUTES.OWNER_VEHICLES,
            title: 'My Vehicles',
            desc: 'Add, edit, delete vehicles',
            icon: Car,
            className: 'bg-sky-50 text-sky-600',
          },
          {
            to: ROUTES.OWNER_EXPENSES,
            title: 'Expenses',
            desc: 'Track fuel, service, toll',
            icon: Receipt,
            className: 'bg-emerald-50 text-emerald-600',
          },
          {
            to: ROUTES.OWNER_REPORTS,
            title: 'Reports',
            desc: 'Monthly & fuel efficiency',
            icon: Gauge,
            className: 'bg-indigo-50 text-indigo-600',
          },
        ].map(({ to, title, desc, icon: Icon, className }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-fleet-300 hover:shadow-md"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${className}`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 group-hover:text-fleet-700">
                {title}
              </p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-fleet-500" />
          </Link>
        ))}
      </section>
    </div>
  );
}
