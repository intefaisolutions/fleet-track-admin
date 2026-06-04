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
  PRIVACY_POLICY: '/privacy',
  TERMS_OF_SERVICE: '/terms',
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
  COMPANY_ADMINS: '/company/admins',
  COMPANY_REPORTS: '/company/reports',
  COMPANY_DRIVERS: '/company/drivers',
  COMPANY_SETTINGS: '/company/settings',
  // Vehicle Owner
  OWNER_DASHBOARD: '/owner/dashboard',
  OWNER_VEHICLES: '/owner/vehicles',
  OWNER_DRIVERS: '/owner/drivers',
  OWNER_EXPENSES: '/owner/expenses',
  OWNER_ADD_EXPENSE: '/owner/expenses/add',
  OWNER_REPORTS: '/owner/reports',
  OWNER_SETTINGS: '/owner/settings',
  OWNER_UPGRADE: '/owner/upgrade',
  // Driver
  DRIVER_DASHBOARD: '/driver/dashboard',
  DRIVER_ADD_EXPENSE: '/driver/add-expense',
  DRIVER_EXPENSES: '/driver/expenses',
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  VEHICLE_OWNER: 'VEHICLE_OWNER',
  DRIVER: 'DRIVER',
} as const;

export const SUPER_ADMIN_ROLE = ROLES.SUPER_ADMIN;

/** Assign on support admin for same read access as Super Admin on dashboard/revenue/licenses */
export const SUPPORT_PLATFORM_READ = 'platform:read';

export const SUPPORT_ADMIN_ROUTE_PERMISSIONS: Array<{
  route: string;
  permission: string;
}> = [
  { route: ROUTES.DASHBOARD, permission: 'dashboard:read' },
  { route: ROUTES.LICENSES, permission: 'licenses:read' },
  { route: ROUTES.COMPANIES, permission: 'companies:read' },
  { route: ROUTES.PRICING, permission: 'settings:read' },
  { route: ROUTES.PAYMENT_SETTINGS, permission: 'payments:write' },
  { route: ROUTES.REVENUE, permission: 'payments:read' },
  { route: ROUTES.SETTINGS, permission: 'settings:read' },
];

function supportAdminHasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes(SUPPORT_PLATFORM_READ)) return true;
  return permissions.includes(required);
}

export function firstSupportAdminRoute(permissions: string[] = []): string {
  const first = SUPPORT_ADMIN_ROUTE_PERMISSIONS.find((entry) =>
    supportAdminHasPermission(permissions, entry.permission),
  );
  return first?.route ?? ROUTES.SIGN_IN;
}

export function permissionForAdminRoute(pathname: string): string | null {
  const found = SUPPORT_ADMIN_ROUTE_PERMISSIONS.find((entry) => entry.route === pathname);
  return found?.permission ?? null;
}

export function supportAdminCanAccessRoute(
  permissions: string[],
  pathname: string,
): boolean {
  const required = permissionForAdminRoute(pathname);
  if (!required) return true;
  return supportAdminHasPermission(permissions, required);
}

export function homeRouteForRole(role: string, permissions: string[] = []): string {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return ROUTES.DASHBOARD;
    case ROLES.SUPPORT_ADMIN:
      return firstSupportAdminRoute(permissions);
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
