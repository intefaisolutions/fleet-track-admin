import { getData, patchData } from './api';

export const platformService = {
  getPlans: () => getData<unknown[]>('/platform/plans'),
  ownerDashboard: () => getData('/platform/owner-dashboard'),
  getPaymentSettings: () => getData('/platform/payment-settings'),
  updatePaymentSettings: (data: Record<string, string>) =>
    patchData('/platform/payment-settings', data),
  updatePlanPricing: (planType: string, data: Record<string, number>) =>
    patchData(`/platform/plans/${planType}`, data),
};
