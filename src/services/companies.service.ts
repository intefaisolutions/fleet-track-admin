import { deleteData, getData, patchData, postData } from './api';
import type { CreateCompanyPayload } from '../types/api';

export interface RegisterCompanyPayload {
  licenseKey: string;
  companyName: string;
  adminName: string;
  email: string;
  phone: string;
  password: string;
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
  update: (id: string, data: Partial<CompanyDetail>) =>
    patchData<CompanyDetail>(`/companies/${id}`, data),
  create: (data: CreateCompanyPayload) => postData('/companies', data),
  register: (data: RegisterCompanyPayload) =>
    postData('/companies/register', data),
  approve: (id: string) => patchData(`/companies/${id}/approve`),
  reject: (id: string) => patchData(`/companies/${id}/reject`),
  suspend: (id: string) => patchData(`/companies/${id}/suspend`),
  activate: (id: string) => patchData(`/companies/${id}/activate`),
  delete: (id: string) => deleteData(`/companies/${id}`),
  getSubAdmins: () =>
    getData<CompanySubAdminsPayload>('/companies/me/sub-admins'),
  addSubAdmin: (data: { name: string; email: string; permissions: string[] }) =>
    postData<CompanySubAdminsPayload>('/companies/me/sub-admins', data),
  removeSubAdmin: (email: string) =>
    deleteData<CompanySubAdminsPayload>(
      `/companies/me/sub-admins/${encodeURIComponent(email)}`,
    ),
};
