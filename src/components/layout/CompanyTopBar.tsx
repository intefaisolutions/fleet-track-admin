import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MobileMenuButton } from './MobileMenuButton';

interface CompanyTopBarProps {
  companyName?: string;
  search: string;
  onSearchChange: (value: string) => void;
  onMenuClick?: () => void;
}

export function CompanyTopBar({ companyName, search, onSearchChange, onMenuClick }: CompanyTopBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const isList = ['/company/vehicles', '/company/users', '/company/drivers'].includes(location.pathname);
      if (!isList) {
        navigate('/company/vehicles');
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 md:flex-nowrap md:gap-3 md:px-6 md:py-0">
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
      <div className="min-w-0 max-w-[42%] shrink-0 sm:max-w-[180px] md:hidden">
        <p className="truncate text-sm font-bold text-slate-900">
          {companyName ?? 'Your Company'}
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="relative min-w-0 flex-1 basis-full sm:basis-auto md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search users, IDs, or vehicles..."
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        {/* <button
          type="button"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button> */}
        <div className="ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
          {user?.fullName?.charAt(0) ?? 'A'}
        </div>
      </div>
    </header>
  );
}
