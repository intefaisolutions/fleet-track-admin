import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MobileMenuButton } from './MobileMenuButton';
import { ROUTES } from '../../config/constants';

const SEARCHABLE_PAGES = [
  { name: 'Dashboard', path: ROUTES.OWNER_DASHBOARD, keywords: ['dashboard', 'overview', 'home'] },
  { name: 'My Vehicles', path: ROUTES.OWNER_VEHICLES, keywords: ['vehicles', 'cars', 'fleet'] },
  { name: 'Driver Management', path: ROUTES.OWNER_DRIVERS, keywords: ['drivers', 'staff'] },
  { name: 'Expenses', path: ROUTES.OWNER_EXPENSES, keywords: ['expenses', 'costs', 'money'] },
  { name: 'Reports', path: ROUTES.OWNER_REPORTS, keywords: ['reports', 'analytics', 'data'] },
  { name: 'Settings', path: ROUTES.OWNER_SETTINGS, keywords: ['settings', 'profile', 'account'] },
  { name: 'Upgrade Plan', path: ROUTES.OWNER_UPGRADE, keywords: ['upgrade', 'plan', 'subscription'] },
];

interface OwnerTopBarProps {
  onMenuClick?: () => void;
}

export function OwnerTopBar({ onMenuClick }: OwnerTopBarProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  const filteredPages = SEARCHABLE_PAGES.filter(p => {
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q));
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (path: string) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
      
      <div ref={searchRef} className="relative min-w-0 flex-1 basis-full md:basis-auto md:max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search pages, settings..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-1 focus:ring-fleet-500"
        />
        
        {isOpen && query.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
            {filteredPages.length > 0 ? (
              <ul className="py-2">
                {filteredPages.map((page) => (
                  <li key={page.path}>
                    <button
                      type="button"
                      onClick={() => handleSelect(page.path)}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-fleet-600 focus:bg-slate-50 focus:text-fleet-600 focus:outline-none transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="font-medium">{page.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No results found for "{query}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
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
