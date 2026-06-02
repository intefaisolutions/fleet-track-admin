import { getData, postData } from './api';

export interface DriverRecord {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  status: string;
  userId?: { _id: string; email?: string; fullName?: string; phone?: string } | string;
}

export interface CreateDriverPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  licenseNumber: string;
}

export const driversService = {
  list: () => getData<DriverRecord[]>('/drivers'),
  getById: (id: string) => getData<DriverRecord>(`/drivers/${id}`),
  create: (data: CreateDriverPayload) => postData('/drivers', data),
};
