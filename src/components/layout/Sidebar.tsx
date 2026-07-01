import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  CreditCard,
  TrendingUp,
  Truck,
  LogOut,
  Settings,
  UserCircle,
  Wallet,
} from 'lucide-react';
import {
  ROLES,
  ROUTES,
  adminRoleLabel,
  supportAdminHasPermission,
} from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { mobileSidebarAsideClass } from '../../hooks/useMobileSidebar';

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { to: ROUTES.LICENSES, label: 'License', icon: KeyRound, permission: 'licenses:read' },
  { to: ROUTES.COMPANIES, label: 'Client Companies', icon: Building2, permission: 'companies:read' },
  { to: ROUTES.ADMIN_WALLETS, label: 'Wallets', icon: Wallet, permission: 'payments:read' },
  { to: ROUTES.PRICING, label: 'Plans', icon: CreditCard, permission: 'settings:read' },
  { to: ROUTES.PAYMENT_SETTINGS, label: 'Payment Configuration', icon: CreditCard, permission: 'payments:write' },
  { to: ROUTES.REVENUE, label: 'Revenue Overview', icon: TrendingUp, permission: 'payments:read' },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings, permission: 'settings:read' },
];

export function Sidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const permissions = user?.permissions ?? [];
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const filteredNav = isSuperAdmin
    ? navItems
    : navItems.filter((item) => supportAdminHasPermission(permissions, item.permission));

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
          <p className="text-sm font-bold text-slate-900">FleetTrack Admin</p>
          <p className="text-xs text-slate-500">
            {user?.role === ROLES.SUPPORT_ADMIN ? 'Support Admin Portal' : 'Super Admin Portal'}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNav.map(({ to, label, icon: Icon }) => (
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

        <NavLink
          to={ROUTES.PROFILE}
          onClick={onNavigate}
          className={({ isActive }) =>
            `relative mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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
              <UserCircle className="h-5 w-5 shrink-0" />
              My Profile
            </>
          )}
        </NavLink>
      </nav>

      <div className="border-t border-slate-100 px-4 py-4">
        <NavLink
          to={ROUTES.PROFILE}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg hover:bg-slate-50"
        >
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.fullName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fleet-100 text-sm font-semibold text-fleet-700">
              {user?.fullName?.charAt(0) ?? 'A'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">{adminRoleLabel(user?.role)}</p>
          </div>
        </NavLink>
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
