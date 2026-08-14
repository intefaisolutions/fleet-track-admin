export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  profileImage?: string | null;
  isEmailVerified: boolean;
  companyId?: string;
  permissions?: string[];
  /** True when this COMPANY_ADMIN is an invited sub-admin with limited grants */
  isSubAdmin?: boolean;
  /** Company Admin only — must complete license activation before dashboard */
  requiresLicenseActivation?: boolean;
  lastLogin?: string | Date | null;
  lastActivity?: string | Date | null;
}

export interface LicenseGraceNotice {
  inGracePeriod: boolean;
  validUntil: string;
  graceEndsAt: string;
  graceDays: number;
  message: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
  licenseNotice?: LicenseGraceNotice;
}

export interface Company {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
  planType?: string;
  vehicleLimit?: number;
  vehicleCount?: number;
  createdAt?: string;
}

export interface CreateCompanyPayload {
  name: string;
  email: string;
  phone: string;
  adminFullName: string;
  adminPassword: string;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
}

export interface DashboardStats {
  totalVehicles: number;
  activeDrivers: number;
  totalExpenses: number;
}
