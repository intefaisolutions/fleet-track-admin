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

export const walletsService = {
  getBalance: () => getData<WalletBalancePayload>('/wallets/balance'),
  getTransactions: () => getData<WalletTransactionRow[]>('/wallets/transactions'),
  getAdminTransactions: () => getData('/wallets/admin/transactions'),
};
