import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL, STORAGE_KEYS, ROUTES } from '../config/constants';
import type { ApiResponse } from '../types/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url ?? '';
  const isPublicAuth =
    url.includes('/auth/login') ||
    url.includes('/auth/google') ||
    url.includes('/auth/setup-super-admin') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/verify-reset-otp') ||
    url.includes('/auth/reset-password') ||
    url.includes('/companies/register') ||
    url.includes('/licenses/validate');

  if (!isPublicAuth) {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
          requestUrl.includes('/auth/google') ||
          requestUrl.includes('/auth/setup-super-admin') ||
          requestUrl.includes('/auth/forgot-password') ||
          requestUrl.includes('/auth/verify-reset-otp') ||
          requestUrl.includes('/auth/reset-password') ||
          requestUrl.includes('/auth/refresh') ||
          requestUrl.includes('/auth/refresh-token') ||
          requestUrl.includes('/auth/logout') ||
          requestUrl.includes('/licenses/validate') ||
          requestUrl.includes('/companies/register');

        // Show "Session expired" only for protected routes after login.
        if (token && !isAuthRoute) {
          const responseMessage =
            'data' in error.response &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'message' in error.response.data &&
            typeof (error.response.data as { message?: unknown }).message ===
              'string'
              ? (error.response.data as { message: string }).message
              : null;

          toast.error(
            responseMessage?.includes('inactivity')
              ? responseMessage
              : 'Session expired. Please login again.',
          );
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
          localStorage.removeItem(STORAGE_KEYS.ROLE);
          localStorage.removeItem(STORAGE_KEYS.DRIVER_LAST_ACTIVITY);
          window.location.href = ROUTES.SIGN_IN;
        }
      } else if (status === 403) {
        const responseData =
          'data' in error.response &&
          error.response.data &&
          typeof error.response.data === 'object'
            ? (error.response.data as {
                message?: string;
                data?: { requiresLicenseActivation?: boolean };
              })
            : null;

        if (responseData?.data?.requiresLicenseActivation) {
          toast.error(
            responseData.message ||
              'License verification required before accessing this area.',
          );
          if (
            !window.location.pathname.startsWith(
              ROUTES.COMPANY_LICENSE_ACTIVATION,
            )
          ) {
            window.location.assign(ROUTES.COMPANY_LICENSE_ACTIVATION);
          }
          return Promise.reject(error);
        }

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
