import { Link } from 'react-router-dom';
import { Car, Receipt, CreditCard } from 'lucide-react';
import { ROUTES } from '../../config/constants';

export function OwnerDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of your fleet, expenses, and subscription.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to={ROUTES.OWNER_VEHICLES}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-fleet-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">My Vehicles</p>
            <p className="text-xs text-slate-500">Manage fleet assets</p>
          </div>
        </Link>
        <Link
          to={ROUTES.OWNER_EXPENSES}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-fleet-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Expenses</p>
            <p className="text-xs text-slate-500">Track spending</p>
          </div>
        </Link>
        <Link
          to={ROUTES.OWNER_UPGRADE}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-fleet-300"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Upgrade Plan</p>
            <p className="text-xs text-slate-500">Subscription options</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
