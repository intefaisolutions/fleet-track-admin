import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL, STORAGE_KEYS, ROUTES } from '../config/constants';
import type { ApiResponse } from '../types/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response
    ) {
      const status = (error.response as { status: number }).status;

      if (status === 401) {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const requestUrl =
          'config' in error &&
          error.config &&
          typeof error.config === 'object' &&
          'url' in error.config &&
          typeof error.config.url === 'string'
            ? error.config.url
            : '';

        const isAuthRoute =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/setup-super-admin') ||
          requestUrl.includes('/auth/forgot-password') ||
          requestUrl.includes('/auth/verify-reset-otp') ||
          requestUrl.includes('/auth/reset-password') ||
          requestUrl.includes('/auth/refresh') ||
          requestUrl.includes('/auth/refresh-token');

        // Show "Session expired" only for protected routes after login.
        if (token && !isAuthRoute) {
          toast.error('Session expired. Please login again.');
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
          localStorage.removeItem(STORAGE_KEYS.ROLE);
          window.location.href = ROUTES.SIGN_IN;
        }
      } else if (status === 403) {
        toast.error("Access denied. You don't have permission for this action.");
      }
    }
    return Promise.reject(error);
  },
);

function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> {
  if (response.data?.success === false) {
    throw { response };
  }
  return response.data;
}

export const getData = async <T>(endpoint: string): Promise<ApiResponse<T>> => {
  const response = await api.get<ApiResponse<T>>(endpoint);
  return unwrap(response);
};

export const postData = async <T>(
  endpoint: string,
  data?: unknown,
): Promise<ApiResponse<T>> => {
  const response = await api.post<ApiResponse<T>>(endpoint, data);
  return unwrap(response);
};

export const patchData = async <T>(
  endpoint: string,
  data?: unknown,
): Promise<ApiResponse<T>> => {
  const response = await api.patch<ApiResponse<T>>(endpoint, data);
  return unwrap(response);
};

export const deleteData = async <T>(
  endpoint: string,
  data?: Record<string, unknown>,
): Promise<ApiResponse<T>> => {
  const response = await api.delete<ApiResponse<T>>(endpoint, { data });
  return unwrap(response);
};

export default api;
