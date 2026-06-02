import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, TrendingUp, Wallet, ClipboardList } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import {
  platformService,
  type RevenueOverviewData,
} from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

const PLAN_CHART_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatInrCompact(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Crore`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return formatInr(amount);
}

function trendText(percent: number, suffix: string) {
  const sign = percent >= 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(percent)}% ${suffix}`;
}

function buildMonthOptions() {
  const options: { value: string; label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    options.push({ value: `${year}-${month}`, label, month, year });
  }
  return options;
}

function exportRevenueCsv(data: RevenueOverviewData) {
  const header = ['Company', 'Plan', 'Amount (INR)', 'Status'];
  const lines = data.revenueByCompany.map((row) =>
    [row.name, row.plan, row.amount, row.status]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(','),
  );
  const summary = [
    '',
    `"Monthly Revenue","${data.monthlyRevenue}"`,
    `"Yearly Revenue","${data.yearlyRevenue}"`,
    `"Pending Payments","${data.pendingPayments}"`,
  ];
  const blob = new Blob(
    [[header.join(','), ...lines, ...summary].join('\n')],
    { type: 'text/csv;charset=utf-8;' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revenue_${data.selectedYear}_${data.selectedMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function planConicGradient(distribution: { planType: string; count: number }[]) {
  const total = distribution.reduce((s, p) => s + p.count, 0);
  if (total === 0) return 'conic-gradient(#e2e8f0 0% 100%)';

  let cursor = 0;
  const stops: string[] = [];
  distribution.forEach((p, i) => {
    const pct = (p.count / total) * 100;
    const end = cursor + pct;
    stops.push(`${PLAN_CHART_COLORS[i % PLAN_CHART_COLORS.length]} ${cursor}% ${end}%`);
    cursor = end;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export function RevenueOverviewPage() {
  const now = new Date();
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [selected, setSelected] = useState(
    () => `${now.getFullYear()}-${now.getMonth() + 1}`,
  );
  const [data, setData] = useState<RevenueOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedParts = useMemo(() => {
    const [y, m] = selected.split('-').map(Number);
    return { year: y, month: m };
  }, [selected]);

  const load = useCallback(() => {
    setLoading(true);
    platformService
      .getRevenueOverview(selectedParts.month, selectedParts.year)
      .then((res) => setData(res.data ?? null))
      .catch((err: unknown) =>
        toast.error(getApiErrorMessage(err, 'Failed to load revenue')),
      )
      .finally(() => setLoading(false));
  }, [selectedParts.month, selectedParts.year]);

  useEffect(() => {
    load();
  }, [load]);

  const maxBar = useMemo(() => {
    if (!data) return 1;
    const amounts = [
      ...data.monthlyTrend.map((m) => m.amount),
      ...data.previousYearTrend.map((m) => m.amount),
    ];
    return Math.max(...amounts, 1);
  }, [data]);

  const chartBars = useMemo(() => {
    if (!data) {
      return MONTHS.map((label) => ({ label, current: 0, previous: 0 }));
    }
    return MONTHS.map((label, i) => ({
      label,
      current: data.monthlyTrend[i]?.amount ?? 0,
      previous: data.previousYearTrend[i]?.amount ?? 0,
    }));
  }, [data]);

  const planGradient = useMemo(
    () => planConicGradient(data?.planDistribution ?? []),
    [data?.planDistribution],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-fleet-500 text-white">
            <TrendingUp className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Revenue Overview</h1>
            <p className="text-sm text-slate-500">
              Real-time financial performance and subscription analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!data || loading}
            onClick={() => data && exportRevenueCsv(data)}
            className="flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-medium text-white hover:bg-fleet-600 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Monthly Revenue"
          value={loading ? '—' : formatInr(data?.monthlyRevenue ?? 0)}
          trend={
            loading || !data
              ? undefined
              : trendText(data.monthlyTrendPercent, 'vs last month')
          }
          trendUp={(data?.monthlyTrendPercent ?? 0) >= 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Yearly Revenue"
          value={loading ? '—' : formatInrCompact(data?.yearlyRevenue ?? 0)}
          trend={
            loading || !data
              ? undefined
              : trendText(data.yearlyTrendPercent, 'vs last year')
          }
          trendUp={(data?.yearlyTrendPercent ?? 0) >= 0}
          icon={<Wallet className="h-5 w-5" />}
          iconBg="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Pending Payments"
          value={loading ? '—' : formatInr(data?.pendingPayments ?? 0)}
          trend={
            loading || !data
              ? undefined
              : `! ${data.overduePendingCount} invoices overdue`
          }
          trendUp={false}
          icon={<ClipboardList className="h-5 w-5" />}
          iconBg="bg-red-50 text-red-600"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Monthly Revenue Trend</h2>
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-fleet-500" /> Gross Revenue
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-fleet-100" /> Previous Period
            </span>
          </div>
        </div>
        <div className="flex h-48 items-end justify-between gap-2 border-b border-slate-100 pb-2">
          {chartBars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex h-40 w-full max-w-10 items-end justify-center gap-0.5">
                <div
                  className="w-2 rounded-t bg-fleet-100"
                  style={{ height: `${Math.max(4, (bar.previous / maxBar) * 100)}%` }}
                  title={`Previous: ${formatInr(bar.previous)}`}
                />
                <div
                  className="w-2.5 rounded-t bg-fleet-500"
                  style={{ height: `${Math.max(4, (bar.current / maxBar) * 100)}%` }}
                  title={`Current: ${formatInr(bar.current)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Revenue by Company</h2>
          </div>
          {loading ? (
            <p className="px-5 py-12 text-center text-slate-400">Loading...</p>
          ) : (data?.revenueByCompany.length ?? 0) === 0 ? (
            <p className="px-5 py-12 text-center text-slate-400">
              No payment activity for this period.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.revenueByCompany.map((row) => (
                  <tr key={`${row.name}-${row.status}`} className="border-b border-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-5 py-3 text-slate-600">{row.plan}</td>
                    <td className="px-5 py-3 text-slate-900">{formatInr(row.amount)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Plan Distribution</h2>
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: planGradient }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-xl font-bold text-slate-900">
              {loading ? '—' : (data?.totalSubscriptions ?? 0)}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Total subscriptions</p>
          {!loading && data && data.planDistribution.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-slate-600">
              {data.planDistribution.map((p, i) => (
                <li key={p.planType} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PLAN_CHART_COLORS[i % PLAN_CHART_COLORS.length] }}
                    />
                    {p.planType}
                  </span>
                  <span>{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
