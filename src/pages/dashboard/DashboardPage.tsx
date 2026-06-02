import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2,
  Download,
  Eye,
  IndianRupee,
  KeyRound,
  Plus,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../config/constants';
import { StatCard } from '../../components/ui/StatCard';
import { platformService, type SuperAdminDashboardData, type SuperAdminPaymentRow } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

type DashboardData = SuperAdminDashboardData & {
  revenueThisMonth?: number;
  revenueTarget?: number;
  revenueGoalPercent?: number;
  activeCompanies?: number;
  totalLicenses?: number;
  activeLicenses?: number;
  expiringSoon?: number;
  monthlyRevenue?: { label: string; amount: number }[];
};

type PaymentRow = SuperAdminPaymentRow & {
  companyId?: { name?: string } | string;
};

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatInrShort(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return formatInr(amount);
}

function companyName(row: PaymentRow): string {
  if (row.companyName) return row.companyName;
  const c = row.companyId;
  if (c && typeof c === 'object' && 'name' in c && c.name) return c.name;
  return 'Client Company';
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PaymentStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const styles =
    s === 'VERIFIED' || s === 'PAID'
      ? 'bg-sky-100 text-sky-800'
      : s === 'PENDING'
        ? 'bg-slate-100 text-slate-600'
        : s === 'REJECTED' || s === 'FAILED'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-600';

  const label =
    s === 'VERIFIED' ? 'PAID' : s === 'REJECTED' ? 'FAILED' : s;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function exportPaymentsCsv(rows: PaymentRow[]) {
  const header = ['Transaction ID', 'Company', 'Date', 'Amount', 'Status'];
  const lines = rows.map((r) =>
    [
      r.transactionId,
      companyName(r),
      formatDate(r.createdAt),
      r.amount,
      r.status,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recent_payments.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'monthly' | 'daily'>('monthly');

  useEffect(() => {
    platformService
      .getDashboard()
      .then((res) => setData((res.data as DashboardData) ?? null))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load dashboard')),
      )
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const revenueThisMonth = stats?.revenueThisMonth ?? data?.revenueThisMonth ?? 0;
  const revenueTarget = stats?.revenueTarget ?? data?.revenueTarget ?? 170000;
  const revenueGoalPercent = stats?.revenueGoalPercent ?? data?.revenueGoalPercent ?? 0;
  const activeCompanies = stats?.activeCompanies ?? data?.activeCompanies ?? 0;
  const totalLicenses = stats?.totalLicensesCreated ?? data?.totalLicenses ?? 0;
  const activeLicenses = stats?.activeLicenses ?? data?.activeLicenses ?? 0;
  const expiringSoon = stats?.expiringSoon ?? data?.expiringSoon ?? 0;
  const monthlyRevenue = data?.revenueChart ?? data?.monthlyRevenue ?? [];
  const maxBar = Math.max(...monthlyRevenue.map((m) => m.amount), 1);
  const recentPayments = data?.recentPayments ?? [];
  const topCompanies = data?.topCompanies ?? [];

  const firstName = user?.fullName?.split(' ')[0] ?? 'Super Admin';

  return (
    <div className="space-y-6">
      {/* Welcome + revenue goal */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm lg:col-span-2"
          style={{ background: 'linear-gradient(135deg, #00AEEF 0%, #0078b3 100%)' }}
        >
          <h1 className="text-2xl font-bold">Welcome back, {firstName}.</h1>
          <p className="mt-2 max-w-lg text-sm text-white/90">
            Your platform has{' '}
            <span className="font-semibold">{activeLicenses} active licenses</span>{' '}
            across {activeCompanies} companies. Keep growing your fleet SaaS
            business.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={ROUTES.REVENUE}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-fleet-600 shadow-sm hover:bg-white/95"
            >
              View Reports
            </Link>
            <Link
              to={ROUTES.COMPANIES}
              className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Manage Fleet
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Revenue Goal</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? '—' : `${revenueGoalPercent}%`}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatInrShort(revenueThisMonth)} /{' '}
            {formatInrShort(revenueTarget)} Target
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-fleet-500 transition-all"
              style={{ width: `${revenueGoalPercent}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Verified subscription payments this month
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue This Month"
          value={loading ? '—' : formatInr(revenueThisMonth)}
          trend="Verified payments"
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard
          title="Active Companies"
          value={loading ? '—' : String(activeCompanies)}
          trend={`${totalLicenses} licenses issued`}
          icon={<Building2 className="h-5 w-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Licenses"
          value={loading ? '—' : String(totalLicenses)}
          trend={`${activeLicenses} active now`}
          icon={<KeyRound className="h-5 w-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Expiring Soon"
          value={loading ? '—' : String(expiringSoon)}
          trend={expiringSoon > 0 ? 'Action required' : 'All good'}
          trendUp={expiringSoon === 0}
          icon={<AlertCircle className="h-5 w-5" />}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Chart + top companies */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Revenue Trends</h2>
              <p className="text-sm text-slate-500">Verified subscription income</p>
            </div>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setChartMode('daily')}
                className={`rounded-md px-3 py-1.5 ${
                  chartMode === 'daily'
                    ? 'bg-fleet-500 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setChartMode('monthly')}
                className={`rounded-md px-3 py-1.5 ${
                  chartMode === 'monthly'
                    ? 'bg-fleet-500 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {chartMode === 'monthly' ? (
            <div className="flex h-48 items-end justify-between gap-2 px-2">
              {monthlyRevenue.map((m, i) => {
                const height = Math.max(8, (m.amount / maxBar) * 100);
                const isLast = i === monthlyRevenue.length - 1;
                return (
                  <div key={m.label} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className={`w-full max-w-10 rounded-t-md transition-all ${
                        isLast ? 'bg-fleet-600' : 'bg-fleet-200'
                      }`}
                      style={{ height: `${height}%` }}
                      title={formatInr(m.amount)}
                    />
                    <span className="text-xs text-slate-500">{m.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Daily breakdown — connect more payment volume to enable
            </div>
          )}
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Top Companies</h2>
            <TrendingUp className="h-5 w-5 text-fleet-500" />
          </div>
          <ul className="space-y-4">
            {topCompanies.length === 0 ? (
              <li className="text-sm text-slate-400">No companies yet.</li>
            ) : (
              topCompanies.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.vehicleCount} vehicles · {c.planType ?? 'FREE'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatInrShort(c.mrrInr ?? c.totalPaidInr)}
                    </p>
                    <p className="text-xs text-slate-400">Total paid</p>
                  </div>
                </li>
              ))
            )}
          </ul>
          <Link
            to={ROUTES.COMPANIES}
            className="mt-4 inline-block text-sm font-medium text-fleet-600 hover:underline"
          >
            View All Companies
          </Link>
          <Link
            to={ROUTES.COMPANIES}
            className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-fleet-500 text-white shadow-lg hover:bg-fleet-600"
            aria-label="Add company"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
      </div>

      {/* Recent payments */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Payments</h2>
          <button
            type="button"
            onClick={() => exportPaymentsCsv(recentPayments)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Transaction ID</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                    No payments yet. Client subscription payments will appear here.
                  </td>
                </tr>
              ) : (
                recentPayments.map((row) => (
                  <tr
                    key={row._id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      #{row.transactionId}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {companyName(row)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {formatInr(row.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={ROUTES.PENDING_PAYMENTS}
                        className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-fleet-600"
                        aria-label="View payment"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
