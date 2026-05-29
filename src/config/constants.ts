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
  FORGOT_PASSWORD: '/forgot-password',
  SETUP_SUPER_ADMIN: '/setup-super-admin',
  REGISTER_COMPANY: '/register-company',
  // Company Owner (Super Admin)
  DASHBOARD: '/dashboard',
  COMPANIES: '/companies',
  LICENSES: '/licenses',
  PRICING: '/pricing',
  PAYMENT_SETTINGS: '/payment-settings',
  REVENUE: '/revenue',
  SETTINGS: '/settings',
  PENDING_PAYMENTS: '/pending-payments',
  // Company Admin
  COMPANY_DASHBOARD: '/company/dashboard',
  COMPANY_USERS: '/company/users',
  COMPANY_VEHICLES: '/company/vehicles',
  COMPANY_EXPENSES: '/company/expenses',
  COMPANY_SUBSCRIPTION: '/company/subscription',
  // Vehicle Owner
  OWNER_DASHBOARD: '/owner/dashboard',
  OWNER_VEHICLES: '/owner/vehicles',
  OWNER_EXPENSES: '/owner/expenses',
  OWNER_UPGRADE: '/owner/upgrade',
  // Driver
  DRIVER_DASHBOARD: '/driver/dashboard',
  DRIVER_ADD_EXPENSE: '/driver/add-expense',
  DRIVER_EXPENSES: '/driver/expenses',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  VEHICLE_OWNER: 'VEHICLE_OWNER',
  DRIVER: 'DRIVER',
} as const;

export const SUPER_ADMIN_ROLE = ROLES.SUPER_ADMIN;

export function homeRouteForRole(role: string): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return ROUTES.DASHBOARD;
    case ROLES.COMPANY_ADMIN:
      return ROUTES.COMPANY_DASHBOARD;
    case ROLES.VEHICLE_OWNER:
      return ROUTES.OWNER_DASHBOARD;
    case ROLES.DRIVER:
      return ROUTES.DRIVER_DASHBOARD;
    default:
      return ROUTES.SIGN_IN;
  }
}
