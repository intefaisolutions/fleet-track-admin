import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, CreditCard, Receipt, Wrench } from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { vehiclesService, type VehicleRecord } from '../../services/vehicles.service';
import { expensesService, type ExpenseRecord } from '../../services/expenses.service';
import { subscriptionsService, type SubscriptionRecord } from '../../services/subscriptions.service';
import { getApiErrorMessage } from '../../utils/validation';
import { toast } from 'react-toastify';

const DUMMY_OWNER_VEHICLES: VehicleRecord[] = [
  {
    _id: 'owner-v-1',
    registrationNumber: 'HR26AB1234',
    make: 'Tata',
    modelName: 'Ace',
    status: 'ACTIVE',
    currentOdometerKm: 45230,
    ownerId: { _id: 'static-owner-1', fullName: 'Vehicle Owner', email: 'owner@fleettrack.com' },
  },
  {
    _id: 'owner-v-2',
    registrationNumber: 'DL01CD5678',
    make: 'Mahindra',
    modelName: 'Bolero Pickup',
    status: 'MAINTENANCE',
    currentOdometerKm: 38910,
    ownerId: { _id: 'static-owner-1', fullName: 'Vehicle Owner', email: 'owner@fleettrack.com' },
  },
];

const DUMMY_OWNER_EXPENSES: ExpenseRecord[] = [
  {
    _id: 'owner-e-1',
    vehicleId: {
      _id: 'owner-v-1',
      registrationNumber: 'HR26AB1234',
      make: 'Tata',
      modelName: 'Ace',
    },
    category: 'FUEL',
    amount: 3450,
    expenseDate: new Date().toISOString(),
    description: 'Fuel refill',
  },
  {
    _id: 'owner-e-2',
    vehicleId: {
      _id: 'owner-v-1',
      registrationNumber: 'HR26AB1234',
      make: 'Tata',
      modelName: 'Ace',
    },
    category: 'SERVICE',
    amount: 27000,
    expenseDate: new Date().toISOString(),
    description: 'Major service',
  },
  {
    _id: 'owner-e-3',
    vehicleId: {
      _id: 'owner-v-2',
      registrationNumber: 'DL01CD5678',
      make: 'Mahindra',
      modelName: 'Bolero Pickup',
    },
    category: 'TOLL',
    amount: 1450,
    expenseDate: new Date().toISOString(),
    description: 'Highway toll',
  },
];

const DUMMY_SUBSCRIPTION: SubscriptionRecord = {
  _id: 'owner-sub-1',
  planType: 'FREE',
  status: 'ACTIVE',
  vehicleLimit: 5,
  currentPeriodEnd: new Date(new Date().getFullYear(), 11, 31).toISOString(),
};

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function OwnerDashboardPage() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([vehiclesService.list(), expensesService.list(), subscriptionsService.list()])
      .then(([vehiclesRes, expensesRes, subsRes]) => {
        const rawVehicles =
          vehiclesRes.status === 'fulfilled'
            ? vehiclesRes.value.data ?? []
            : [];
        const ownerVehicles = rawVehicles.filter((v) => {
          if (!v.ownerId || typeof v.ownerId === 'string') return false;
          return v.ownerId._id === user?.id || v.ownerId.email === user?.email;
        });

        const finalVehicles =
          ownerVehicles.length > 0 ? ownerVehicles : rawVehicles.length > 0 ? rawVehicles : DUMMY_OWNER_VEHICLES;
        setVehicles(finalVehicles);

        const rawExpenses =
          expensesRes.status === 'fulfilled'
            ? expensesRes.value.data ?? []
            : [];
        const vehicleIds = new Set(finalVehicles.map((v) => v._id));
        const ownerExpenses = rawExpenses.filter((e) => {
          const vehicleId = typeof e.vehicleId === 'object' ? e.vehicleId?._id : e.vehicleId;
          return vehicleId ? vehicleIds.has(vehicleId) : false;
        });
        setExpenses(ownerExpenses.length > 0 ? ownerExpenses : rawExpenses.length > 0 ? rawExpenses : DUMMY_OWNER_EXPENSES);

        const subs =
          subsRes.status === 'fulfilled'
            ? subsRes.value.data ?? []
            : [];
        setSubscription(subs[0] ?? DUMMY_SUBSCRIPTION);

        if (
          vehiclesRes.status !== 'fulfilled' ||
          expensesRes.status !== 'fulfilled' ||
          subsRes.status !== 'fulfilled'
        ) {
          toast.info('Showing demo owner dashboard data');
        }
      })
      .catch((err: unknown) => {
        setVehicles(DUMMY_OWNER_VEHICLES);
        setExpenses(DUMMY_OWNER_EXPENSES);
        setSubscription(DUMMY_SUBSCRIPTION);
        toast.info('Showing demo owner dashboard data');
        toast.error(getApiErrorMessage(err, 'Failed to load owner dashboard'));
      })
      .finally(() => setLoading(false));
  }, [user?.email, user?.id]);

  const currentMonthTotal = useMemo(() => {
    const key = monthKey(new Date());
    return expenses
      .filter((e) => {
        const d = new Date(e.expenseDate ?? e.createdAt ?? '');
        return !Number.isNaN(d.getTime()) && monthKey(d) === key;
      })
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const mostExpensiveVehicle = useMemo(() => {
    const byVehicle = new Map<string, { name: string; amount: number }>();
    expenses.forEach((e) => {
      const vid = typeof e.vehicleId === 'object' ? e.vehicleId?._id : e.vehicleId;
      const reg =
        typeof e.vehicleId === 'object' && e.vehicleId?.registrationNumber
          ? e.vehicleId.registrationNumber
          : 'Unknown';
      const model =
        typeof e.vehicleId === 'object'
          ? [e.vehicleId?.make, e.vehicleId?.modelName].filter(Boolean).join(' ')
          : 'Vehicle';
      if (!vid) return;
      const prev = byVehicle.get(vid) ?? { name: `${reg} (${model})`, amount: 0 };
      prev.amount += Number(e.amount || 0);
      byVehicle.set(vid, prev);
    });

    return Array.from(byVehicle.values()).sort((a, b) => b.amount - a.amount)[0] ?? null;
  }, [expenses]);

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => {
        const da = new Date(a.expenseDate ?? a.createdAt ?? '').getTime();
        const db = new Date(b.expenseDate ?? b.createdAt ?? '').getTime();
        return db - da;
      })
      .slice(0, 4);
  }, [expenses]);

  const upcomingServices = useMemo(() => {
    return vehicles.slice(0, 3).map((v, idx) => ({
      id: v._id,
      label: `${v.registrationNumber} – ${v.make} ${v.modelName}`,
      dueInKm: 500 + idx * 300,
    }));
  }, [vehicles]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Personalized overview of your own vehicles and expenses.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">My Vehicles</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : vehicles.length}
          </p>
          <p className="text-sm text-slate-500">
            {subscription?.planType ?? 'Free'} Plan: {vehicles.length}/{subscription?.vehicleLimit ?? 5} used
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Expenses (This Month)</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? '—' : formatInr(currentMonthTotal)}
          </p>
          <p className="text-sm text-slate-500">Across all your vehicles</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan Status</p>
          <p className="mt-2 text-xl font-bold text-slate-900">
            {subscription?.planType ?? 'FREE'} Plan
          </p>
          <p className="text-sm text-slate-500">
            {subscription?.vehicleLimit ?? 5} vehicles max
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Most Expensive Vehicle</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {mostExpensiveVehicle?.name ?? '—'}
          </p>
          <p className="text-sm text-slate-500">
            {mostExpensiveVehicle ? formatInr(mostExpensiveVehicle.amount) : 'No expense records'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming Services</p>
          <div className="mt-3 space-y-2">
            {upcomingServices.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming services</p>
            ) : (
              upcomingServices.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">{s.label}</p>
                  <p className="text-xs font-semibold text-amber-700">Due in {s.dueInKm} km</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Expenses</p>
        <div className="mt-3 space-y-2">
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-slate-400">No recent expenses.</p>
          ) : (
            recentExpenses.map((e) => {
              const reg =
                typeof e.vehicleId === 'object' && e.vehicleId?.registrationNumber
                  ? e.vehicleId.registrationNumber
                  : 'Unknown Vehicle';
              return (
                <div key={e._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-sm text-slate-700">
                    {e.category} {formatInr(Number(e.amount || 0))} on {reg}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(e.expenseDate ?? e.createdAt ?? '').toLocaleDateString('en-IN')}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

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

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <div className="flex items-center gap-1 font-semibold">
          <Wrench className="h-4 w-4" />
          Service Reminder Logic
        </div>
        <p className="mt-1">
          Upcoming service values are estimated for dashboard preview and can be tied to exact service rules later.
        </p>
      </div>
    </div>
  );
}
