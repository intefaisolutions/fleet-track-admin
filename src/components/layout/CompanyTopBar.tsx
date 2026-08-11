import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MobileMenuButton } from './MobileMenuButton';
import { NotificationBell } from '../notifications/NotificationBell';
import { ROUTES } from '../../config/constants';

const SEARCHABLE_PAGES = [
  { name: 'Dashboard', path: ROUTES.COMPANY_DASHBOARD, keywords: ['dashboard', 'overview', 'home'] },
  { name: 'Users', path: ROUTES.COMPANY_USERS, keywords: ['users', 'owners', 'staff'] },
  { name: 'Vehicles', path: ROUTES.COMPANY_VEHICLES, keywords: ['vehicles', 'cars', 'fleet'] },
  { name: 'Expenses', path: ROUTES.COMPANY_EXPENSES, keywords: ['expenses', 'costs'] },
  { name: 'Subscription', path: ROUTES.COMPANY_SUBSCRIPTION, keywords: ['subscription', 'plan', 'billing'] },
  { name: 'Admins', path: ROUTES.COMPANY_ADMINS, keywords: ['admins', 'managers'] },
  { name: 'Reports', path: ROUTES.COMPANY_REPORTS, keywords: ['reports', 'analytics'] },
  { name: 'Drivers', path: ROUTES.COMPANY_DRIVERS, keywords: ['drivers', 'chauffeurs'] },
  { name: 'My Profile', path: ROUTES.COMPANY_PROFILE, keywords: ['profile', 'account', 'me'] },
  { name: 'Settings', path: ROUTES.COMPANY_SETTINGS, keywords: ['settings', 'company'] },
  { name: 'Wallet', path: ROUTES.COMPANY_WALLET, keywords: ['wallet', 'balance'] },
];

interface CompanyTopBarProps {
  companyName?: string;
  onMenuClick?: () => void;
}

export function CompanyTopBar({ companyName, onMenuClick }: CompanyTopBarProps) {
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
    <header className="relative z-30 flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 md:flex-nowrap md:gap-3 md:px-6 md:py-0">
      {onMenuClick && <MobileMenuButton onClick={onMenuClick} />}
      <div className="min-w-0 max-w-[42%] shrink-0 sm:max-w-[180px] md:hidden">
        <p className="truncate text-sm font-bold text-slate-900">
          {companyName ?? 'Your Company'}
        </p>
      </div>

      <div ref={searchRef} className="relative min-w-0 flex-1 basis-full sm:basis-auto md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search pages, users, settings..."
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

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <NotificationBell />
        <button
          type="button"
          onClick={() => navigate(ROUTES.COMPANY_PROFILE)}
          title="My Profile"
          className="ml-2 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-fleet-500 to-fleet-700 text-sm font-semibold text-white shadow-sm shadow-fleet-500/20 transition hover:ring-2 hover:ring-fleet-500/30"
        >
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.fullName ?? 'Profile'}
              className="h-full w-full object-cover"
            />
          ) : (
            (user?.fullName?.charAt(0) ?? 'A')
          )}
        </button>
      </div>
    </header>
  );
}
