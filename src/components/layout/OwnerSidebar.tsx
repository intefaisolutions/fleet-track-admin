import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Car,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Truck,
  Users,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { mobileSidebarAsideClass } from '../../hooks/useMobileSidebar';

const links = [
  { to: ROUTES.OWNER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.OWNER_VEHICLES, label: 'My Vehicles', icon: Car },
  { to: ROUTES.OWNER_DRIVERS, label: 'Driver Management', icon: Users },
  { to: ROUTES.OWNER_EXPENSES, label: 'Expenses', icon: Receipt },
  { to: ROUTES.OWNER_REPORTS, label: 'Reports', icon: BarChart3 },
  { to: ROUTES.OWNER_UPGRADE, label: 'Upgrade Plan', icon: CreditCard },
  { to: ROUTES.OWNER_SETTINGS, label: 'Settings', icon: Settings },
];

export function OwnerSidebar({
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

  return (
    <aside
      className={`${mobileSidebarAsideClass(mobileOpen)} border-r border-slate-200 bg-white`}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fleet-500 text-white">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">FleetTrack</p>
          <p className="text-xs text-slate-500">Vehicle Owner</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
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

      <div className="border-t border-slate-100 px-4 py-4">
        <p className="truncate text-xs font-semibold text-slate-700">
          {user?.fullName ?? 'Owner'}
        </p>
        <p className="truncate text-xs text-slate-400">{user?.email}</p>
      </div>

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
