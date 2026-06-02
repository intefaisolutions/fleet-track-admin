import { getData, patchData, postData, deleteData } from './api';

export interface PricingOverview {
  plans: SubscriptionPlanRecord[];
  yearlyDiscountPercent: number;
  stats: {
    activeSubscriptions: number;
    pendingTransitions: number;
    canceledLast30Days: number;
  };
}

export interface SubscriptionPlanRecord {
  _id?: string;
  planType: string;
  displayName?: string;
  description?: string;
  features?: string[];
  isSystem?: boolean;
  vehicleLimit: number;
  monthlyPriceInr: number;
  yearlyPriceInr: number;
  maxAdmins?: number;
  maxOwners?: number;
  maxDrivers?: number;
}

export interface CreatePlanPayload {
  displayName: string;
  description?: string;
  vehicleLimit: number;
  monthlyPriceInr: number;
  yearlyPriceInr: number;
  maxAdmins?: number;
  maxOwners?: number;
  maxDrivers?: number;
  features?: string[];
}

export interface SuperAdminDashboardStats {
  revenueThisMonth: number;
  revenueTarget: number;
  revenueGoalPercent: number;
  activeCompanies: number;
  totalLicensesCreated: number;
  activeLicenses: number;
  expiringSoon: number;
}

export interface SuperAdminRevenuePoint {
  label: string;
  amount: number;
  month: number;
  year: number;
}

export interface SuperAdminPaymentRow {
  _id: string;
  transactionId: string;
  amount: number;
  status: string;
  planType?: string;
  createdAt?: string;
  verifiedAt?: string;
  companyId?: string;
  companyName: string;
}

export interface SuperAdminTopCompany {
  id: string;
  name: string;
  email?: string;
  planType?: string;
  vehicleCount: number;
  totalPaidInr: number;
  mrrInr: number;
}

export interface SuperAdminDashboardData {
  stats: SuperAdminDashboardStats;
  revenueChart: SuperAdminRevenuePoint[];
  recentPayments: SuperAdminPaymentRow[];
  topCompanies: SuperAdminTopCompany[];
}

export const platformService = {
  getPlans: () => getData<unknown[]>('/platform/plans'),
  getPricingOverview: () => getData<PricingOverview>('/platform/pricing-overview'),
  createPlan: (data: CreatePlanPayload) => postData<SubscriptionPlanRecord>('/platform/plans', data),
  /** Super Admin dashboard — SRS 4.1 */
  getDashboard: () => getData<SuperAdminDashboardData>('/platform/dashboard'),
  /** @deprecated use getDashboard */
  ownerDashboard: () => getData<SuperAdminDashboardData>('/platform/dashboard'),
  getPaymentSettings: () => getData('/platform/payment-settings'),
  updatePaymentSettings: (data: Record<string, string>) =>
    patchData('/platform/payment-settings', data),
  updatePlanPricing: (planType: string, data: Record<string, number>) =>
    patchData(`/platform/plans/${planType}`, data),
  getSupportAdmins: () =>
    getData<{ name: string; email: string; permissions: string[] }[]>(
      '/platform/support-admins',
    ),
  addSupportAdmin: (data: {
    name: string;
    email: string;
    permissions: string[];
  }) => postData('/platform/support-admins', data),
  removeSupportAdmin: (email: string) =>
    deleteData(`/platform/support-admins/${encodeURIComponent(email)}`),
};
