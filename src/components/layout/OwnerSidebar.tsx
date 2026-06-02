import { NavLink } from 'react-router-dom';
import { Car, LayoutDashboard, Receipt, Users } from 'lucide-react';
import { ROUTES } from '../../config/constants';

const links = [
  { to: ROUTES.OWNER_DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.OWNER_VEHICLES, label: 'My Vehicles', icon: Car },
  { to: ROUTES.OWNER_DRIVERS, label: 'Driver Management', icon: Users },
  { to: ROUTES.OWNER_EXPENSES, label: 'Expenses', icon: Receipt },
];

export function OwnerSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-[#0f172a] text-white">
      <div className="border-b border-slate-700 px-6 py-5">
        <p className="text-lg font-bold tracking-tight">FleetTrack</p>
        <p className="text-xs text-slate-400">Vehicle Owner</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-fleet-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

