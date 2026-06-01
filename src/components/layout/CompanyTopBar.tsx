import { Bell, HelpCircle, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CompanyTopBarProps {
  companyName?: string;
}

export function CompanyTopBar({ companyName }: CompanyTopBarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <div className="min-w-0 shrink-0 text-center sm:text-left">
        <p className="truncate text-sm font-bold text-slate-900">
          {companyName ?? 'Your Company'}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Company Dashboard
        </p>
      </div>

      <div className="relative mx-auto max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search users, IDs, or vehicles..."
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-fleet-100 text-sm font-semibold text-fleet-700">
          {user?.fullName?.charAt(0) ?? 'A'}
        </div>
      </div>
    </header>
  );
}
