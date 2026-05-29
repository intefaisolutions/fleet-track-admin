import { getData, patchData, postData } from './api';
import type { CreateCompanyPayload } from '../types/api';

export interface RegisterCompanyPayload {
  licenseKey: string;
  companyName: string;
  adminName: string;
  email: string;
  phone: string;
  password: string;
}

export const companiesService = {
  list: (status?: string) =>
    getData<unknown[]>(status ? `/companies?status=${status}` : '/companies'),
  getAll: () => getData<unknown[]>('/companies'),
  create: (data: CreateCompanyPayload) => postData('/companies', data),
  register: (data: RegisterCompanyPayload) =>
    postData('/companies/register', data),
  approve: (id: string) => patchData(`/companies/${id}/approve`),
  reject: (id: string) => patchData(`/companies/${id}/reject`),
  suspend: (id: string) => patchData(`/companies/${id}/suspend`),
};
