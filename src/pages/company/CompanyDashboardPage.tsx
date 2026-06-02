import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Banknote,
  Download,
  Filter,
  IdCard,
  Map,
  Plus,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ASSETS } from '../../config/assets';
import { ROUTES } from '../../config/constants';
import {
  reportsService,
  type CompanyDashboardData,
  type CompanyDashboardOwner,
} from '../../services/reports.service';
import { getApiErrorMessage } from '../../utils/validation';

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function ownerInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function exportOwnersCsv(rows: CompanyDashboardOwner[]) {
  const header = ['Owner Name', 'Email', 'Fleet Size'];
  const lines = rows.map((r) =>
    [r.name, r.email, r.fleetSize]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'top_owners.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  label,
  value,
  icon,
  iconClass,
  badge,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {badge && <div className="mt-2">{badge}</div>}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function CompanyDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsService
      .getCompanyDashboard()
      .then((res) => setData(res.data ?? null))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load dashboard')),
      )
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.fullName?.split(' ')[0] ?? 'Admin';
  const expiryLabel = formatExpiry(data?.subscription?.expiresAt ?? null);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50 shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-2 md:items-center md:p-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
              {loading ? (
                'Loading your fleet overview...'
              ) : (
                <>
                  Everything looks stable today. Your fleet of{' '}
                  <span className="font-semibold text-slate-900">
                    {data?.totalVehicles ?? 0} vehicles
                  </span>{' '}
                  is operating across{' '}
                  <span className="font-semibold text-slate-900">
                    {data?.totalOwners ?? 0} sectors
                  </span>{' '}
                  with{' '}
                  <span className="font-semibold text-slate-900">
                    {data?.driverEfficiency ?? 0}% driver efficiency
                  </span>
                  .
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={ROUTES.COMPANY_VEHICLES}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New Deployment
              </Link>
              <button
                type="button"
                onClick={() => toast.info('Fleet map view coming soon')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Map className="h-4 w-4" />
                View Map
              </button>
            </div>
          </div>
          <div className="relative hidden justify-end md:flex">
            <img
              src={ASSETS.companyDashboardHero}
              alt=""
              className="max-h-40 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = ASSETS.vehiclesFleetHero;
              }}
            />
          </div>
        </div>
      </section>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Total Vehicles"
          value={loading ? '—' : String(data?.totalVehicles ?? 0)}
          icon={<Truck className="h-5 w-5" />}
          iconClass="bg-sky-50 text-sky-600"
          badge={
            !loading && (data?.vehicleGrowthPercent ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <TrendingUp className="h-3 w-3" />+{data?.vehicleGrowthPercent}%
              </span>
            ) : null
          }
        />
        <MetricCard
          label="Total Owners"
          value={loading ? '—' : String(data?.totalOwners ?? 0)}
          icon={<Users className="h-5 w-5" />}
          iconClass="bg-violet-50 text-violet-600"
        />
        <MetricCard
          label="Total Drivers"
          value={loading ? '—' : String(data?.totalDrivers ?? 0)}
          icon={<IdCard className="h-5 w-5" />}
          iconClass="bg-slate-100 text-slate-600"
          badge={
            !loading ? (
              <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                {data?.activeDrivers ?? 0} Active
              </span>
            ) : null
          }
        />
        <MetricCard
          label="Total Expenses (This Month)"
          value={loading ? '—' : formatInr(data?.expensesThisMonth ?? 0)}
          icon={<Banknote className="h-5 w-5" />}
          iconClass="bg-red-50 text-red-500"
        />
        <MetricCard
          label="Active Subscription"
          value={loading ? '—' : (data?.subscription?.planLabel ?? 'Free')}
          icon={<Star className="h-5 w-5" />}
          iconClass="bg-sky-50 text-sky-600"
          badge={
            expiryLabel ? (
              <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                Expires {expiryLabel}
              </span>
            ) : null
          }
        />
      </section>

      {/* Bottom grid */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Activities</h2>
            <Link
              to={ROUTES.COMPANY_EXPENSES}
              className="text-sm font-semibold text-fleet-600 hover:text-fleet-700"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : (data?.recentActivities.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No recent activity yet.</p>
          ) : (
            <ul className="space-y-5">
              {data?.recentActivities.map((activity) => (
                <li key={activity.id} className="flex gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      activity.type === 'maintenance'
                        ? 'bg-sky-100 text-sky-600'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {activity.type === 'maintenance' ? (
                      <Wrench className="h-4 w-4" />
                    ) : (
                      <Banknote className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{activity.message}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {timeAgo(activity.createdAt)} • {activity.meta}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Top Owners</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Filter"
                onClick={() => toast.info('Filters coming soon')}
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Export"
                onClick={() => exportOwnersCsv(data?.topOwners ?? [])}
                disabled={loading || !data?.topOwners.length}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-3 hidden grid-cols-[1fr_auto] gap-4 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
            <span>Owner Name</span>
            <span className="text-right">Fleet Size</span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
          ) : (data?.topOwners.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No vehicle owners with assigned vehicles yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data?.topOwners.map((owner) => (
                <li
                  key={owner.id}
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {ownerInitials(owner.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{owner.name}</p>
                      <p className="truncate text-xs text-slate-500">{owner.email}</p>
                    </div>
                  </div>
                  <div className="sm:w-48 sm:text-right">
                    <p className="mb-1.5 text-sm font-semibold text-slate-800">
                      {owner.name.split(' ')[0]}: {owner.fleetSize} vehicles
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-fleet-500 transition-all"
                        style={{ width: `${owner.fleetPercent}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
