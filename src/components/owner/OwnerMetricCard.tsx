import type { ReactNode } from 'react';

export function OwnerMetricCard({
  label,
  value,
  hint,
  icon,
  iconClass,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  iconClass: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
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
