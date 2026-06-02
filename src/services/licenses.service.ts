import { getData, patchData, postData } from './api';

export interface CreateLicensePayload {
  intendedCompanyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  planType: string;
  maxAdmins?: number;
  maxOwners?: number;
  maxDrivers?: number;
  maxVehicles?: number;
  validUntil: string;
  notes?: string;
}

export interface LicenseValidateResult {
  valid: boolean;
  message?: string;
  plan?: string;
  planLabel?: string;
  intendedCompanyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  maxAdmins?: number;
  maxOwners?: number;
  maxDrivers?: number;
  maxVehicles?: number;
  validUntil?: string;
}

export interface CreatedLicense {
  _id: string;
  licenseKey: string;
  intendedCompanyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  planType: string;
  validUntil?: string;
  emailed?: boolean;
}

export const licensesService = {
  list: (status?: string) =>
    getData<unknown[]>(status ? `/licenses?status=${status}` : '/licenses'),
  create: (data: CreateLicensePayload) =>
    postData<CreatedLicense>('/licenses', data),
  validateKey: (key: string) =>
    getData<LicenseValidateResult>(
      `/licenses/validate?key=${encodeURIComponent(key)}`,
    ),
  revoke: (id: string) => patchData(`/licenses/${id}/revoke`),
  extend: (id: string, validUntil: string) =>
    patchData(`/licenses/${id}/extend`, { validUntil }),
  cancel: (id: string) => patchData(`/licenses/${id}/cancel`),
  sendEmail: (id: string) => postData(`/licenses/${id}/send-email`, {}),
};
