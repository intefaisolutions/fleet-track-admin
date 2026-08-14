import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Car,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Receipt,
  Sparkles,
  Truck,
  UserCircle,
  UserRound,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { mobileSidebarAsideClass } from '../../hooks/useMobileSidebar';
import { reportsService } from '../../services/reports.service';
import {
  vehiclesService,
  type VehicleRecord,
} from '../../services/vehicles.service';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  countKey?: 'vehicles' | 'drivers' | 'expenses';
  highlight?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: ROUTES.OWNER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
      { to: ROUTES.OWNER_REPORTS, label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'My fleet',
    items: [
      {
        to: ROUTES.OWNER_VEHICLES,
        label: 'My Vehicles',
        icon: Car,
        countKey: 'vehicles',
      },
      {
        to: ROUTES.OWNER_DRIVERS,
        label: 'Drivers',
        icon: UserRound,
        countKey: 'drivers',
      },
      {
        to: ROUTES.OWNER_EXPENSES,
        label: 'Expenses',
        icon: Receipt,
        countKey: 'expenses',
      },
    ],
  },
  {
    title: 'Billing',
    items: [
      {
        to: ROUTES.OWNER_UPGRADE,
        label: 'View Plans',
        icon: CreditCard,
        highlight: true,
      },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: ROUTES.OWNER_PROFILE, label: 'My Profile', icon: UserCircle },
    ],
  },
];

function assignedDriverId(ref?: VehicleRecord['assignedDriverId']): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

export function OwnerSidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [counts, setCounts] = useState({
    vehicles: 0,
    drivers: 0,
    expenses: 0,
    vehicleLimit: 0,
    companyUsed: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [dashRes, vehRes] = await Promise.allSettled([
        reportsService.getOwnerDashboard(),
        vehiclesService.list(),
      ]);
      if (cancelled) return;

      let vehicles = 0;
      let expenses = 0;
      let vehicleLimit = 0;
      let companyUsed = 0;
      let drivers = 0;

      if (dashRes.status === 'fulfilled' && dashRes.value.data) {
        const d = dashRes.value.data;
        vehicles = d.totalVehicles ?? 0;
        expenses = d.expensesCountThisMonth ?? 0;
        vehicleLimit = d.myVehiclesLimit ?? 0;
        companyUsed = d.companyVehicleCount ?? d.totalVehicles ?? 0;
      }

      if (vehRes.status === 'fulfilled') {
        const list = vehRes.value.data ?? [];
        if (dashRes.status !== 'fulfilled') vehicles = list.length;
        const ids = new Set(
          list.map((v) => assignedDriverId(v.assignedDriverId)).filter(Boolean),
        );
        drivers = ids.size;
      }

      setCounts({ vehicles, drivers, expenses, vehicleLimit, companyUsed });
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const atCompanyLimit =
    counts.vehicleLimit > 0 && counts.companyUsed >= counts.vehicleLimit;

  const initials = useMemo(
    () =>
      user?.fullName
        ?.split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('') || 'VO',
    [user?.fullName],
  );

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.SIGN_IN);
  };

  const countFor = (key?: NavItem['countKey']) => {
    if (!key) return null;
    return counts[key];
  };

  return (
    <aside
      className={`${mobileSidebarAsideClass(mobileOpen)} border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-fleet-50/40`}
    >
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
              Vehicle Owner
            </p>
          </div>
        </div>
        {atCompanyLimit ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-900">
                Company vehicle limit reached
              </p>
              <p className="text-[10px] text-amber-700">
                {counts.companyUsed}/{counts.vehicleLimit} used — ask admin to upgrade
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, countKey, highlight }) => {
                const count = countFor(countKey);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-fleet-500 text-white shadow-sm shadow-fleet-500/30'
                          : highlight
                            ? 'text-fleet-700 hover:bg-fleet-50'
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
                              : highlight
                                ? 'bg-fleet-100 text-fleet-600'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-fleet-100 group-hover:text-fleet-600'
                          }`}
                        >
                          <Icon
                            className="h-4 w-4"
                            strokeWidth={isActive ? 2.25 : 1.75}
                          />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {count != null ? (
                          <span
                            className={`ml-auto inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : countKey === 'vehicles' && atCompanyLimit
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-fleet-100 group-hover:text-fleet-700'
                            }`}
                          >
                            {count}
                          </span>
                        ) : isActive ? (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-100 bg-white/70 px-3 py-3 backdrop-blur-sm">
        <NavLink
          to={ROUTES.OWNER_PROFILE}
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
              {user?.fullName ?? 'Owner'}
            </p>
            <p className="truncate text-[11px] text-slate-500">View profile</p>
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
