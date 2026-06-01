import { getData, postData } from './api';

export interface DriverRecord {
  _id: string;
  fullName: string;
  phone: string;
  licenseNumber?: string;
  status: string;
  userId?: string;
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
  create: (data: CreateDriverPayload) => postData('/drivers', data),
};
