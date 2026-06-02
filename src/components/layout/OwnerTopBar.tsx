import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OwnerTopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function OwnerTopBar({ search, onSearchChange }: OwnerTopBarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-6">
      <div className="relative mx-auto max-w-xl flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search vehicles, registration..."
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-900">
            {user?.fullName ?? 'Fleet Manager'}
          </p>
          <p className="text-xs text-slate-500">Vehicle Owner</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
          {user?.fullName?.charAt(0) ?? 'F'}
        </div>
      </div>
    </header>
  );
}
