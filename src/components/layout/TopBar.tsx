import { Bell, HelpCircle, Search } from 'lucide-react';
import { MobileMenuButton } from './MobileMenuButton';

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
      <div className="relative min-w-0 flex-1 basis-full md:basis-auto md:max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search across fleet, companies, or revenue..."
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
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
          className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:flex"
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </button>
      </div>
    </header>
  );
}
