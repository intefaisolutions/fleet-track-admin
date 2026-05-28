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
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
}

export interface Company {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
  status?: string;
  createdAt?: string;
}

export interface CreateCompanyPayload {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  isActive?: boolean;
}

export interface DashboardStats {
  totalVehicles: number;
  activeDrivers: number;
  totalExpenses: number;
}
