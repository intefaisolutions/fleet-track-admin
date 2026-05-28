import { Download, TrendingUp, Wallet, ClipboardList } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';

const revenueByCompany = [
  {
    name: 'TransGlobal Logistics',
    plan: 'Enterprise',
    amount: '₹1,45,000',
    status: 'PAID',
  },
  {
    name: 'SwiftFleet India',
    plan: 'Professional',
    amount: '₹85,000',
    status: 'PAID',
  },
  {
    name: 'Metro Haulers',
    plan: 'Starter',
    amount: '₹32,000',
    status: 'PENDING',
  },
];

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function RevenueOverviewPage() {
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
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option>October 2023</option>
            <option>May 2026</option>
          </select>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-fleet-500 px-4 py-2 text-sm font-medium text-white hover:bg-fleet-600"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Monthly Revenue"
          value="₹12,45,000"
          trend="↑ +12.5% vs last month"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Yearly Revenue"
          value="₹1.48 Crore"
          trend="↑ +8.2% annual target"
          icon={<Wallet className="h-5 w-5" />}
          iconBg="bg-amber-50 text-amber-700"
        />
        <StatCard
          title="Pending Payments"
          value="₹2,84,500"
          trend="! 14 invoices overdue"
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
          {months.map((m, i) => (
            <div key={m} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-8 rounded-t bg-fleet-500"
                style={{ height: `${30 + (i % 5) * 12}%` }}
              />
              <span className="text-[10px] text-slate-400">{m}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Revenue by Company</h2>
            <button type="button" className="text-sm font-medium text-fleet-600">
              View All
            </button>
          </div>
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
              {revenueByCompany.map((row) => (
                <tr key={row.name} className="border-b border-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-5 py-3 text-slate-600">{row.plan}</td>
                  <td className="px-5 py-3 text-slate-900">{row.amount}</td>
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
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Plan Distribution</h2>
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'conic-gradient(#0ea5e9 0% 45%, #38bdf8 45% 70%, #7dd3fc 70% 100%)',
              }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-xl font-bold text-slate-900">
              418
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">Total subscriptions</p>
        </div>
      </div>
    </div>
  );
}
