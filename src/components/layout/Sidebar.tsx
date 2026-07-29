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
  Landmark,
} from 'lucide-react';
import {
  ROLES,
  ROUTES,
  adminRoleLabel,
  supportAdminHasPermission,
} from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { mobileSidebarAsideClass } from '../../hooks/useMobileSidebar';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      {
        to: ROUTES.DASHBOARD,
        label: 'Dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard:read',
      },
      {
        to: ROUTES.REVENUE,
        label: 'Revenue Overview',
        icon: TrendingUp,
        permission: 'payments:read',
      },
    ],
  },
  {
    title: 'Clients',
    items: [
      {
        to: ROUTES.COMPANIES,
        label: 'Client Companies',
        icon: Building2,
        permission: 'companies:read',
      },
      {
        to: ROUTES.LICENSES,
        label: 'License',
        icon: KeyRound,
        permission: 'licenses:read',
      },
    ],
  },
  {
    title: 'Billing',
    items: [
      {
        to: ROUTES.PRICING,
        label: 'Plans',
        icon: CreditCard,
        permission: 'settings:read',
      },
      {
        to: ROUTES.PAYMENT_SETTINGS,
        label: 'Payment Config',
        icon: Landmark,
        permission: 'payments:write',
      },
      {
        to: ROUTES.ADMIN_WALLETS,
        label: 'Wallets',
        icon: Wallet,
        permission: 'payments:read',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        to: ROUTES.SETTINGS,
        label: 'Settings',
        icon: Settings,
        permission: 'settings:read',
      },
      {
        to: ROUTES.PROFILE,
        label: 'My Profile',
        icon: UserCircle,
        permission: 'dashboard:read',
      },
    ],
  },
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

  const filteredGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: isSuperAdmin
      ? group.items
      : group.items.filter((item) =>
          // Profile always available for support admins who can reach the portal
          item.to === ROUTES.PROFILE
            ? true
            : supportAdminHasPermission(permissions, item.permission),
        ),
  })).filter((group) => group.items.length > 0);

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
      .join('') || 'SA';

  const portalLabel =
    user?.role === ROLES.SUPPORT_ADMIN ? 'Support Admin' : 'Super Admin';

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
              FleetTrack Admin
            </p>
            <p className="truncate text-xs font-medium text-fleet-600">{portalLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
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
        <NavLink
          to={ROUTES.PROFILE}
          onClick={onNavigate}
          className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-fleet-50"
        >
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.fullName}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fleet-500 to-fleet-700 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user?.fullName ?? 'Admin'}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {adminRoleLabel(user?.role)}
            </p>
          </div>
        </NavLink>

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
