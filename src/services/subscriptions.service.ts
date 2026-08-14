import { getData, postData } from './api';

export interface SubscriptionRecord {
  _id: string;
  planType: string;
  status: string;
  vehicleLimit: number;
  currentPeriodEnd?: string;
  billingPeriod?: string;
}

export interface PlanChangePreview {
  currentPlan?: string;
  newPlan?: string;
  currentPrice?: number;
  newPrice?: number;
  billingPeriod?: string;
  usedDays?: number;
  remainingDays?: number;
  creditGenerated?: number;
  walletBalanceBefore?: number;
  useWallet?: boolean;
  walletUsed?: number;
  walletBalanceAfter?: number;
  amountToPay?: number;
  paymentRequired?: boolean;
}

export const subscriptionsService = {
  list: () => getData<SubscriptionRecord[]>('/subscriptions'),
  previewChange: (data: {
    newPlanId: string;
    billingPeriod?: 'MONTHLY' | 'YEARLY';
    useWallet?: boolean;
  }) => postData<PlanChangePreview>('/subscriptions/preview-change', data),
};
