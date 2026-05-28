import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: ReactNode;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  trend,
  trendUp = true,
  icon,
  iconBg = 'bg-fleet-50 text-fleet-600',
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p
              className={`mt-2 text-xs font-medium ${
                trendUp ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trend}
            </p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
