import { getData, patchData, postData } from './api';

export interface CreateLicensePayload {
  intendedCompanyName?: string;
  contactEmail?: string;
  planType: string;
  maxAdmins?: number;
  maxOwners?: number;
  maxDrivers?: number;
  maxVehicles?: number;
  validUntil: string;
  notes?: string;
}

export const licensesService = {
  list: (status?: string) =>
    getData<unknown[]>(status ? `/licenses?status=${status}` : '/licenses'),
  create: (data: CreateLicensePayload) => postData('/licenses', data),
  revoke: (id: string) => patchData(`/licenses/${id}/revoke`),
  extend: (id: string, validUntil: string) =>
    patchData(`/licenses/${id}/extend`, { validUntil }),
};
