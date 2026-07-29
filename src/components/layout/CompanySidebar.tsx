import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  UserRound,
  Banknote,
  CreditCard,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { mobileSidebarAsideClass } from '../../hooks/useMobileSidebar';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: ROUTES.COMPANY_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
      { to: ROUTES.COMPANY_REPORTS, label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { to: ROUTES.COMPANY_VEHICLES, label: 'Vehicles', icon: Truck },
      { to: ROUTES.COMPANY_DRIVERS, label: 'Drivers', icon: UserRound },
      { to: ROUTES.COMPANY_EXPENSES, label: 'Expenses', icon: Banknote },
    ],
  },
  {
    title: 'People',
    items: [
      { to: ROUTES.COMPANY_USERS, label: 'Users', icon: Users },
      { to: ROUTES.COMPANY_ADMINS, label: 'Admins', icon: Shield },
    ],
  },
  {
    title: 'Billing',
    items: [
      { to: ROUTES.COMPANY_SUBSCRIPTION, label: 'Subscription', icon: CreditCard },
      { to: ROUTES.COMPANY_WALLET, label: 'Wallet', icon: Wallet },
    ],
  },
  {
    title: 'Account',
    items: [{ to: ROUTES.COMPANY_SETTINGS, label: 'Settings', icon: Settings }],
  },
];

export function CompanySidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.SIGN_IN);
  };

  const initials =
    user?.fullName
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'CA';

  return (
    <aside
      className={`${mobileSidebarAsideClass(mobileOpen)} border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-fleet-50/40`}
    >
      {/* Brand */}
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-fleet-500 to-fleet-700 text-white shadow-md shadow-fleet-500/25">
            <Truck className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">
              FleetTrack
            </p>
            <p className="truncate text-xs font-medium text-fleet-600">
              Company Admin
            </p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-fleet-500 text-white shadow-sm shadow-fleet-500/30'
                        : 'text-slate-600 hover:bg-fleet-50 hover:text-fleet-700'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-fleet-100 group-hover:text-fleet-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={isActive ? 2.25 : 1.75} />
                      </span>
                      <span className="truncate">{label}</span>
                      {isActive ? (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="mt-auto border-t border-slate-100 bg-white/70 px-3 py-3 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fleet-500 to-fleet-700 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user?.fullName ?? 'Company Admin'}
            </p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <LogOut className="h-4 w-4" />
          </span>
          Log Out
        </button>
      </div>
    </aside>
  );
}
