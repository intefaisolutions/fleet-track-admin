import { getData } from './api';

export interface CompanyDashboardActivity {
  id: string;
  type: 'maintenance' | 'expense';
  message: string;
  meta: string;
  createdAt: string;
}

export interface CompanyDashboardOwner {
  id: string;
  name: string;
  email: string;
  fleetSize: number;
  fleetPercent: number;
}

export interface CompanyDashboardData {
  totalVehicles: number;
  totalOwners: number;
  totalDrivers: number;
  activeDrivers: number;
  expensesThisMonth: number;
  driverEfficiency: number;
  vehicleGrowthPercent: number;
  subscription: {
    planType: string;
    planLabel: string;
    expiresAt: string | null;
    status: string;
  };
  recentActivities: CompanyDashboardActivity[];
  topOwners: CompanyDashboardOwner[];
}

export const reportsService = {
  getCompanyDashboard: () =>
    getData<CompanyDashboardData>('/reports/dashboard'),
};
