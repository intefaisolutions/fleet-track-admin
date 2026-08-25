import api, { postData } from './api';

export interface CreateOrderPayload {
  planId: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  companyName: string;
  adminName: string;
  email: string;
  phone: string;
  password?: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  pendingCompanyId: string;
}

class OnboardingService {
  async createOrder(payload: CreateOrderPayload) {
    return postData<any>('/platform/public-registration/create-order', payload);
  }

  async verifyPayment(payload: VerifyPaymentPayload) {
    return postData<any>('/platform/public-registration/verify-payment', payload);
  }
}

export const onboardingService = new OnboardingService();
