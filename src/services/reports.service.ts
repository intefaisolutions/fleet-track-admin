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
  expensesCountThisMonth?: number;
  totalExpenses?: number;
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
  myVehiclesLimit?: number;
  mostExpensiveVehicle?: {
    registrationNumber: string;
    label: string;
    amount: number;
  } | null;
  upcomingServices?: Array<{
    id: string;
    registrationNumber: string;
    label: string;
    dueInKm: number;
  }>;
  recentOwnerExpenses?: Array<{
    id: string;
    category: string;
    amount: number;
    registrationNumber: string;
    createdAt: string;
  }>;
}

export const reportsService = {
  getCompanyDashboard: () =>
    getData<CompanyDashboardData>('/reports/dashboard'),
  getOwnerDashboard: () =>
    getData<CompanyDashboardData>('/reports/dashboard'),
};
