export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fleetAccessToken',
  REFRESH_TOKEN: 'fleetRefreshToken',
  ADMIN_USER: 'fleetAdminUser',
  ROLE: 'fleetRole',
} as const;

export const ROUTES = {
  SIGN_IN: '/signin',
  SETUP_SUPER_ADMIN: '/setup-super-admin',
  DASHBOARD: '/dashboard',
  COMPANIES: '/companies',
  LICENSES: '/licenses',
  SUBSCRIPTIONS: '/subscriptions',
  REVENUE: '/revenue',
} as const;

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';
