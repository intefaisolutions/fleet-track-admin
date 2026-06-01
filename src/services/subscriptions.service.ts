import { getData } from './api';

export interface SubscriptionRecord {
  _id: string;
  planType: string;
  status: string;
  vehicleLimit: number;
  currentPeriodEnd?: string;
  billingPeriod?: string;
}

export const subscriptionsService = {
  list: () => getData<SubscriptionRecord[]>('/subscriptions'),
};
