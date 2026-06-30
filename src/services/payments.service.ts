import { getData, patchData, postData } from './api';

export const paymentsService = {
  list: (status?: string) =>
    getData<unknown[]>(status ? `/payments?status=${status}` : '/payments'),
  submit: (data: Record<string, unknown>) => postData('/payments/submit', data),
  verify: (id: string) => patchData(`/payments/${id}/verify`),
  reject: (id: string, rejectionReason?: string) =>
    patchData(`/payments/${id}/reject`, { rejectionReason }),
  createRazorpayOrder: (data: Record<string, unknown>) =>
    postData('/payments/razorpay/create-order', data),
  verifyRazorpayPayment: (data: Record<string, unknown>) =>
    postData('/payments/razorpay/verify', data),
};
