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

export interface RevenueOverviewCompanyRow {
  name: string;
  plan: string;
  amount: number;
  status: string;
}

export interface PaymentSettingsRecord {
  upiId?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
}

export interface RevenueOverviewData {
  selectedMonth: number;
  selectedYear: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  pendingPayments: number;
  pendingCount: number;
  overduePendingCount: number;
  monthlyTrendPercent: number;
  yearlyTrendPercent: number;
  monthlyTrend: SuperAdminRevenuePoint[];
  previousYearTrend: SuperAdminRevenuePoint[];
  revenueByCompany: RevenueOverviewCompanyRow[];
  planDistribution: { planType: string; count: number }[];
  totalSubscriptions: number;
}

export const platformService = {
  getPlans: () => getData<unknown[]>('/platform/plans'),
  getPricingOverview: () => getData<PricingOverview>('/platform/pricing-overview'),
  getRevenueOverview: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month != null) params.set('month', String(month));
    if (year != null) params.set('year', String(year));
    const q = params.toString();
    return getData<RevenueOverviewData>(
      q ? `/platform/revenue-overview?${q}` : '/platform/revenue-overview',
    );
  },
  createPlan: (data: CreatePlanPayload) => postData<SubscriptionPlanRecord>('/platform/plans', data),
  /** Super Admin dashboard — SRS 4.1 */
  getDashboard: () => getData<SuperAdminDashboardData>('/platform/dashboard'),
  /** @deprecated use getDashboard */
  ownerDashboard: () => getData<SuperAdminDashboardData>('/platform/dashboard'),
  getPaymentSettings: () => getData<PaymentSettingsRecord>('/platform/payment-settings'),
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
    phone: string;
    password: string;
    permissions: string[];
  }) => postData('/platform/support-admins', data),
  updateSupportAdminPermissions: (email: string, permissions: string[]) =>
    patchData(
      `/platform/support-admins/${encodeURIComponent(email)}/permissions`,
      { permissions },
    ),
  removeSupportAdmin: (email: string) =>
    deleteData(`/platform/support-admins/${encodeURIComponent(email)}`),
};
