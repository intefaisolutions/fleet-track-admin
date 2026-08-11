import { deleteData, getData, patchData, postData } from './api';
import type { CreateCompanyPayload } from '../types/api';

export interface RegisterCompanyPayload {
  companyName: string;
  adminName: string;
  email: string;
  phone: string;
  password?: string;
  googleIdToken?: string;
}

export interface CompanyDetail {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  logoUrl?: string;
  licenseKey?: string;
  licenseValidUntil?: string;
  status?: string;
  planType?: string;
  vehicleLimit?: number;
  maxAdmins?: number;
  maxOwners?: number;
  maxDrivers?: number;
  walletBalance?: number;
  createdAt?: string;
  subscription?: {
    planType?: string;
    status?: string;
    billingPeriod?: string;
    startDate?: string;
    currentPeriodEnd?: string;
    originalPrice?: number;
    amountPaid?: number;
    vehicleLimit?: number;
  } | null;
  stats?: {
    vehicleCount: number;
    driverCount: number;
    expenseCount: number;
    expenseTotal: number;
    ownerCount: number;
    adminCount: number;
  };
}

export interface CompanyDetailPayload extends CompanyDetail {
  vehicles: Array<Record<string, unknown>>;
  drivers: Array<Record<string, unknown>>;
  expenses: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
}

export interface LicenseActivationStatus {
  companyName: string;
  email: string;
  maskedEmail: string;
  licenseActivated: boolean;
  requiresActivation: boolean;
  resendCooldownSeconds?: number;
  canResendEmail?: boolean;
}

export interface LicenseResendResult {
  maskedEmail: string;
  resendCooldownSeconds: number;
  canResendEmail: boolean;
}

export interface CompanySubAdmin {
  name: string;
  email: string;
  permissions: string[];
  status: string;
  invitedAt?: string;
}

export interface CompanySubAdminsStats {
  total: number;
  active: number;
  pending: number;
  rolesDefined: number;
}

export interface CompanySubAdminsPayload {
  admins: CompanySubAdmin[];
  stats: CompanySubAdminsStats;
}

export const companiesService = {
  list: (status?: string) =>
    getData<unknown[]>(status ? `/companies?status=${status}` : '/companies'),
  getAll: () => getData<unknown[]>('/companies'),
  getById: (id: string) => getData<CompanyDetail>(`/companies/${id}`),
  getDetail: (id: string) => getData<CompanyDetailPayload>(`/companies/${id}/detail`),
  update: (id: string, data: Partial<CompanyDetail>) =>
    patchData<CompanyDetail>(`/companies/${id}`, data),
  create: (data: CreateCompanyPayload) => postData('/companies', data),
  register: (data: RegisterCompanyPayload) =>
    postData('/companies/register', data),
  approve: (id: string) => patchData(`/companies/${id}/approve`),
  reject: (id: string) => patchData(`/companies/${id}/reject`),
  suspend: (id: string, reason: string) => patchData(`/companies/${id}/suspend`, { reason }),
  activate: (id: string) => patchData(`/companies/${id}/activate`),
  delete: (id: string) => deleteData(`/companies/${id}`),
  getSubAdmins: () =>
    getData<CompanySubAdminsPayload>('/companies/me/sub-admins'),
  addSubAdmin: (data: { name: string; email: string; permissions: string[] }) =>
    postData<CompanySubAdminsPayload>('/companies/me/sub-admins', data),
  updateSubAdmin: (
    email: string,
    data: { name?: string; permissions: string[] },
  ) =>
    patchData<CompanySubAdminsPayload>(
      `/companies/me/sub-admins/${encodeURIComponent(email)}`,
      data,
    ),
  removeSubAdmin: (email: string) =>
    deleteData<CompanySubAdminsPayload>(
      `/companies/me/sub-admins/${encodeURIComponent(email)}`,
    ),
  getLicenseActivationStatus: () =>
    getData<LicenseActivationStatus>('/companies/me/license-activation'),
  activateLicense: (licenseKey: string) =>
    postData<LicenseActivationStatus>('/companies/me/activate-license', {
      licenseKey,
    }),
  resendLicenseEmail: () =>
    postData<LicenseResendResult>('/companies/me/resend-license-email', {}),
};
