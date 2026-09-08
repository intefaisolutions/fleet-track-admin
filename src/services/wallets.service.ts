import { getData } from './api';

export interface WalletCurrentPlan {
  planType?: string;
  displayName?: string;
  vehicleLimit?: number;
  status?: string;
  currentPeriodEnd?: string | null;
  billingPeriod?: string | null;
}

export interface WalletLastChange {
  action?: string;
  actionLabel?: string;
  fromPlan?: string;
  fromPlanName?: string;
  toPlan?: string;
  toPlanName?: string;
  oldPrice?: number;
  newPrice?: number;
  usedDays?: number;
  usedAmount?: number;
  remainingDays?: number;
  creditGenerated?: number;
  walletUsed?: number;
  changedAt?: string;
  summary?: string;
}

export interface WalletBalancePayload {
  walletBalance: number;
  currentPlan?: WalletCurrentPlan;
  lastChange?: WalletLastChange | null;
}

export interface WalletTransactionRow {
  _id: string;
  type: 'CREDIT' | 'DEBIT' | string;
  amount: number;
  reason?: string;
  description?: string;
  friendlyExplanation?: string;
  createdAt?: string;
  usedDays?: number;
  usedAmount?: number;
  remainingDays?: number;
  fromPlan?: string;
  toPlan?: string;
  changeAction?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminWalletStats {
  totalBalance: number;
  companiesWithBalance: number;
  totalCompanies: number;
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
}

export interface AdminCompanyBalanceRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  planType?: string;
  status?: string;
  walletBalance: number;
  logoUrl?: string;
  createdAt?: string;
}

export interface AdminWalletTransactionRow {
  _id: string;
  companyId?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    logoUrl?: string;
  } | string;
  type: 'CREDIT' | 'DEBIT' | string;
  amount: number;
  previousBalance?: number;
  currentBalance?: number;
  reason?: string;
  description?: string;
  friendlyExplanation?: string;
  createdAt?: string;
  usedDays?: number;
  usedAmount?: number;
  remainingDays?: number;
  fromPlan?: string;
  toPlan?: string;
  changeAction?: string;
}

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const walletsService = {
  getBalance: () => getData<WalletBalancePayload>('/wallets/balance'),
  getTransactions: () => getData<WalletTransactionRow[]>('/wallets/transactions'),
  getAdminStats: () => getData<AdminWalletStats>('/wallets/admin/stats'),
  getAdminBalances: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    hasBalance?: boolean;
  }) =>
    getData<PaginatedResult<AdminCompanyBalanceRow>>(
      `/wallets/admin/balances${buildQueryString(params)}`,
    ),
  getAdminTransactions: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    companyId?: string;
  }) =>
    getData<PaginatedResult<AdminWalletTransactionRow>>(
      `/wallets/admin/transactions${buildQueryString(params)}`,
    ),
};
