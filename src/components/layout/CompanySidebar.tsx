import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
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

const navItems = [
  { to: ROUTES.COMPANY_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.COMPANY_USERS, label: 'Users', icon: Users },
  { to: ROUTES.COMPANY_VEHICLES, label: 'Vehicles', icon: Truck },
  { to: ROUTES.COMPANY_EXPENSES, label: 'Expenses', icon: Banknote },
  { to: ROUTES.COMPANY_SUBSCRIPTION, label: 'Subscription', icon: CreditCard },
  { to: ROUTES.COMPANY_WALLET, label: 'Wallet', icon: Wallet },
  { to: ROUTES.COMPANY_ADMINS, label: 'Admins', icon: Shield },
  { to: ROUTES.COMPANY_REPORTS, label: 'Reports', icon: BarChart3 },
  { to: ROUTES.COMPANY_SETTINGS, label: 'Settings', icon: Settings },
];

export function CompanySidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.SIGN_IN);
  };

  return (
    <aside className={`${mobileSidebarAsideClass(mobileOpen)} bg-[#0c1929]`}>
      <div className="px-6 py-6">
        <p className="text-xl font-bold tracking-tight text-white">FleetTrack</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#1a2d44] text-fleet-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mx-3 mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200"
      >
        <LogOut className="h-5 w-5" strokeWidth={1.75} />
        Log Out
      </button>
    </aside>
  );
}
