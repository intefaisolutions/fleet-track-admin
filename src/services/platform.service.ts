import { getData, patchData, postData, deleteData } from './api';

export const platformService = {
  getPlans: () => getData<unknown[]>('/platform/plans'),
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
