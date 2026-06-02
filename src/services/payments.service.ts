import { getData, patchData, postData } from './api';

export interface PaymentRecord {
  _id: string;
  planType?: string;
  amount?: number;
  status?: string;
  transactionId?: string;
  createdAt?: string;
}

export const paymentsService = {
  list: (status?: string) =>
    getData<PaymentRecord[]>(status ? `/payments?status=${status}` : '/payments'),
  submit: (data: Record<string, unknown>) => postData('/payments/submit', data),
  verify: (id: string) => patchData(`/payments/${id}/verify`),
  reject: (id: string, rejectionReason?: string) =>
    patchData(`/payments/${id}/reject`, { rejectionReason }),
};
