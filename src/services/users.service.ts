import { getData, patchData, postData, deleteData } from './api';

export interface UserRecord {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  companyId?: string;
  createdAt?: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  companyId?: string;
  status?: string;
}

export const usersService = {
  list: (status?: string) =>
    getData<UserRecord[]>(status ? `/users?status=${status}` : '/users'),
  create: (data: CreateUserPayload) => postData('/users', data),
  updateStatus: (id: string, status: string) =>
    patchData(`/users/${id}/status`, { status }),
  remove: (id: string) => deleteData(`/users/${id}`),
};
