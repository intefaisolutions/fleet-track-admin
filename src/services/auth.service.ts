import { postData, getData } from './api';
import type { AuthUser, LoginResponse } from '../types/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SetupSuperAdminPayload {
  setupSecret: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  profileImage?: string;
}

export const authService = {
  login: (data: LoginPayload) =>
    postData<LoginResponse>('/auth/login', data),

  setupSuperAdmin: (data: SetupSuperAdminPayload) =>
    postData<AuthUser>('/auth/setup-super-admin', data),

  refresh: (refreshToken: string) =>
    postData<{ accessToken: string; refreshToken: string; expiresIn: string }>(
      '/auth/refresh',
      { refreshToken },
    ),

  logout: () => postData('/auth/logout'),

  profile: () => getData<AuthUser>('/auth/profile'),

  forgotPassword: (email: string) =>
    postData<{ expiresAt?: string; otp?: string }>('/auth/forgot-password', {
      email,
    }),

  verifyResetOtp: (email: string, otp: string) =>
    postData('/auth/verify-reset-otp', { email, otp }),

  resetPassword: (payload: {
    email: string;
    token: string;
    password: string;
  }) => postData('/auth/reset-password', payload),
};
