import { useEffect, useState } from 'react';
import { Building2, Users, Truck } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { analyticsService } from '../../services/analytics.service';
import { companiesService } from '../../services/companies.service';
import type { DashboardStats } from '../../types/api';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [companyCount, setCompanyCount] = useState(0);

  useEffect(() => {
    analyticsService.getDashboard().then((r) => setStats(r.data ?? null)).catch(() => {});
    companiesService.getAll().then((r) => setCompanyCount(r.data?.length ?? 0)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Fleet platform overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Client Companies"
          value={String(companyCount)}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Total Vehicles"
          value={String(stats?.totalVehicles ?? 0)}
          icon={<Truck className="h-5 w-5" />}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Active Drivers"
          value={String(stats?.activeDrivers ?? 0)}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Expense Records"
          value={String(stats?.totalExpenses ?? 0)}
          icon={<Truck className="h-5 w-5" />}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>
    </div>
  );
}
