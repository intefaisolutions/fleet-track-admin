import { getData, postData, patchData, deleteData } from './api';
import type { Company, CreateCompanyPayload } from '../types/api';

export const companiesService = {
  getAll: () => getData<Company[]>('/companies'),
  getOne: (id: string) => getData<Company>(`/companies/${id}`),
  create: (data: CreateCompanyPayload) => postData<Company>('/companies', data),
  update: (id: string, data: Partial<Company>) =>
    patchData<Company>(`/companies/${id}`, data),
  remove: (id: string) => deleteData(`/companies/${id}`),
};
