import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Receipt,
  CreditCard,
  UserCog,
  BarChart3,
  Car,
  Settings,
  LogOut,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: ROUTES.COMPANY_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.COMPANY_USERS, label: 'Users', icon: Users },
  { to: ROUTES.COMPANY_VEHICLES, label: 'Vehicles', icon: Truck },
  { to: ROUTES.COMPANY_EXPENSES, label: 'Expenses', icon: Receipt },
  { to: ROUTES.COMPANY_SUBSCRIPTION, label: 'Subscription', icon: CreditCard },
  { to: ROUTES.COMPANY_ADMINS, label: 'Admins', icon: UserCog },
  { to: ROUTES.COMPANY_REPORTS, label: 'Reports', icon: BarChart3 },
  { to: ROUTES.COMPANY_DRIVERS, label: 'Drivers', icon: Car },
  { to: ROUTES.COMPANY_SETTINGS, label: 'Settings', icon: Settings },
];

export function CompanySidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.SIGN_IN);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fleet-500 text-white">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">FleetTrack</p>
          <p className="text-xs text-slate-500">Company Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-fleet-50 text-fleet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute right-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l bg-fleet-500" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mx-3 mb-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-5 w-5" />
        Log Out
      </button>
    </aside>
  );
}
