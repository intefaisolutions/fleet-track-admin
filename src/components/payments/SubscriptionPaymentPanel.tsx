import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  CreditCard,
  Landmark,
  Loader2,
  Send,
  Smartphone,
} from 'lucide-react';
import { paymentsService } from '../../services/payments.service';
import type { SubscriptionPlanRecord } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';
import { formatInr } from '../../utils/currency';

export type UpgradePaymentMethod = 'RAZORPAY' | 'UPI' | 'BANK_TRANSFER';

type PaymentSettings = Record<string, string>;

const loadRazorpayScript = () =>
  new Promise<boolean>((resolve) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const METHODS: Array<{
  id: UpgradePaymentMethod;
  label: string;
  hint: string;
  icon: typeof CreditCard;
}> = [
  {
    id: 'RAZORPAY',
    label: 'Razorpay',
    hint: 'Pay online — plan activates instantly after success',
    icon: CreditCard,
  },
  {
    id: 'UPI',
    label: 'Manual UPI',
    hint: 'Pay via PhonePe / GPay, then submit TXN ID',
    icon: Smartphone,
  },
  {
    id: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    hint: 'NEFT/IMPS, then submit reference number',
    icon: Landmark,
  },
];

export function SubscriptionPaymentPanel({
  selectedPlan,
  paymentSettings,
  billingPeriod = 'MONTHLY',
  onSuccess,
}: {
  selectedPlan: SubscriptionPlanRecord | null;
  paymentSettings: PaymentSettings;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  onSuccess?: () => void;
}) {
  const [method, setMethod] = useState<UpgradePaymentMethod>('RAZORPAY');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amount =
    billingPeriod === 'YEARLY'
      ? selectedPlan?.yearlyPriceInr ?? 0
      : selectedPlan?.monthlyPriceInr ?? 0;
  const upiId =
    paymentSettings.upiId?.trim() ||
    paymentSettings.defaultUpiId?.trim() ||
    '';
  const bankAccount = paymentSettings.bankAccountNumber?.trim() || '';
  const ifsc = paymentSettings.ifscCode?.trim() || '';
  const accountName = paymentSettings.accountHolderName?.trim() || '';

  const upiLink = useMemo(() => {
    if (!upiId || !amount) return '';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('FleetTrack')}&am=${amount}&cu=INR&tn=${encodeURIComponent(selectedPlan?.displayName ?? selectedPlan?.planType ?? 'Plan')}`;
  }, [upiId, amount, selectedPlan]);

  const payWithRazorpay = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }
    if (amount <= 0) {
      toast.error('Selected plan has no payable amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await paymentsService.createRazorpayOrder({
        planType: selectedPlan.planType,
        billingPeriod,
      });
      const orderData = res.data as {
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
      };

      if (orderData?.orderId === 'WALLET_PAID') {
        toast.success('Plan upgraded using wallet credits!');
        onSuccess?.();
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay. Please try again or use Manual UPI.');
        return;
      }

      const key =
        orderData.keyId ||
        (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ||
        '';
      if (!key) {
        toast.error(
          'Razorpay key is not configured (VITE_RAZORPAY_KEY_ID). Use Manual UPI or Bank Transfer.',
        );
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const options = {
          key,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'FleetTrack',
          description: `Upgrade to ${selectedPlan.displayName ?? selectedPlan.planType}`,
          order_id: orderData.orderId,
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await paymentsService.verifyRazorpayPayment({
                ...response,
                planType: selectedPlan.planType,
                billingPeriod,
              });
              toast.success('Payment successful! Subscription activated.');
              onSuccess?.();
              resolve();
            } catch (err: unknown) {
              toast.error(
                getApiErrorMessage(
                  err,
                  'Payment received but verification failed. Contact support — subscription was not activated.',
                ),
              );
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              toast.info('Payment cancelled. Subscription was not activated.');
              resolve();
            },
          },
          theme: { color: '#00AEEF' },
        };

        const rzp = new (window as unknown as {
          Razorpay: new (opts: unknown) => {
            open: () => void;
            on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void;
          };
        }).Razorpay(options);

        rzp.on('payment.failed', (response) => {
          toast.error(
            `Payment failed: ${response.error?.description || 'Unknown error'}. Subscription was not activated.`,
          );
          reject(new Error(response.error?.description || 'Payment failed'));
        });
        rzp.open();
      });
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to start Razorpay payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitManual = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }
    if (method === 'UPI' && !upiId) {
      toast.error('UPI is not configured. Contact support or try Bank Transfer.');
      return;
    }
    if (method === 'BANK_TRANSFER' && !bankAccount) {
      toast.error('Bank details are not configured. Contact support or try UPI.');
      return;
    }
    if (transactionId.trim().length < 4) {
      toast.error('Enter a valid transaction / reference ID');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.submit({
        planType: selectedPlan.planType,
        billingPeriod,
        amount,
        transactionId: transactionId.trim(),
        paymentMethod: method,
        notes:
          method === 'UPI'
            ? `Manual UPI payment to ${upiId}`
            : `Bank transfer to ${bankAccount}${ifsc ? ` / ${ifsc}` : ''}`,
      });
      toast.success(
        'Payment proof submitted. Plan will activate after Super Admin verifies.',
      );
      setTransactionId('');
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not submit payment proof'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = () => {
    if (method === 'RAZORPAY') return payWithRazorpay();
    return submitManual();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-800">Choose payment method</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-fleet-500 bg-fleet-50 ring-1 ring-fleet-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? 'text-fleet-600' : 'text-slate-400'}`}
                />
                <p className="mt-2 text-sm font-semibold text-slate-900">{m.label}</p>
                <p className="mt-1 text-xs text-slate-500">{m.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Amount due:{' '}
        <span className="font-semibold">
          {selectedPlan ? formatInr(amount) : '—'}{' '}
          {selectedPlan
            ? `(${selectedPlan.displayName ?? selectedPlan.planType} · ${
                billingPeriod === 'YEARLY' ? 'Yearly' : 'Monthly'
              })`
            : ''}
        </span>
      </div>

      {method === 'RAZORPAY' && (
        <p className="text-sm text-slate-500">
          You will be redirected to Razorpay Checkout. On success, payment is verified by
          signature and your subscription activates automatically. Failed or cancelled
          payments do not change your plan.
        </p>
      )}

      {method === 'UPI' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-2 text-sm">
            <Smartphone className="mt-0.5 h-4 w-4 text-fleet-600" />
            <div>
              <p className="text-xs text-slate-500">Pay to UPI ID</p>
              <p className="font-semibold text-slate-900">{upiId || 'Not configured'}</p>
            </div>
          </div>
          {upiLink ? (
            <a
              href={upiLink}
              className="inline-flex text-sm font-semibold text-fleet-600 hover:underline"
            >
              Open UPI app
            </a>
          ) : null}
          <input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
            placeholder="UPI Transaction ID (e.g. TXN123456789)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-fleet-500"
          />
        </div>
      )}

      {method === 'BANK_TRANSFER' && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-2 text-sm">
            <Building2 className="mt-0.5 h-4 w-4 text-fleet-600" />
            <div className="space-y-1">
              <p className="text-xs text-slate-500">Bank transfer details</p>
              <p className="font-semibold text-slate-900">
                A/C: {bankAccount || 'Not configured'}
              </p>
              {ifsc ? <p className="text-slate-700">IFSC: {ifsc}</p> : null}
              {accountName ? (
                <p className="text-slate-700">Name: {accountName}</p>
              ) : null}
            </div>
          </div>
          <input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
            placeholder="Bank reference / UTR number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-fleet-500"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || !selectedPlan}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60 sm:w-auto"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : method === 'RAZORPAY' ? (
          <CreditCard className="h-4 w-4" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting
          ? 'Processing...'
          : method === 'RAZORPAY'
            ? 'Pay with Razorpay'
            : 'I Have Paid — Submit Proof'}
      </button>
    </div>
  );
}
