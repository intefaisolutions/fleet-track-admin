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

export const platformService = {
  getPlans: () => getData<unknown[]>('/platform/plans'),
  getPricingOverview: () => getData<PricingOverview>('/platform/pricing-overview'),
  createPlan: (data: CreatePlanPayload) => postData<SubscriptionPlanRecord>('/platform/plans', data),
  ownerDashboard: () => getData('/platform/owner-dashboard'),
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
