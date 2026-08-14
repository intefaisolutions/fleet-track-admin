import { useEffect, useMemo, useState } from 'react';
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
import { uploadImage } from '../../services/storage.service';
import {
  getApiErrorMessage,
  validateBankUtr,
  validatePaymentPaidAt,
  validateUpiTransactionId,
} from '../../utils/validation';
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
  changeKind,
  onSuccess,
}: {
  selectedPlan: SubscriptionPlanRecord | null;
  paymentSettings: PaymentSettings;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  changeKind?: 'upgrade' | 'downgrade';
  onSuccess?: () => void;
}) {
  const [method, setMethod] = useState<UpgradePaymentMethod>('RAZORPAY');
  const [transactionId, setTransactionId] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    transactionId?: string;
    paidAt?: string;
    proofUrl?: string;
  }>({});

  useEffect(() => {
    setTransactionId('');
    setPaidAt('');
    setProofUrl('');
    setFieldErrors({});
  }, [method]);

  const listPrice =
    billingPeriod === 'YEARLY'
      ? selectedPlan?.yearlyPriceInr ?? 0
      : selectedPlan?.monthlyPriceInr ?? 0;

  const isDowngrade = changeKind === 'downgrade';
  const needsRazorpay = !isDowngrade && listPrice > 0;

  const upiId =
    paymentSettings.upiId?.trim() ||
    paymentSettings.defaultUpiId?.trim() ||
    '';
  const bankAccount = paymentSettings.bankAccountNumber?.trim() || '';
  const ifsc = paymentSettings.ifscCode?.trim() || '';
  const accountName = paymentSettings.accountHolderName?.trim() || '';

  const upiLink = useMemo(() => {
    if (!upiId || !listPrice) return '';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('FleetTrack')}&am=${listPrice}&cu=INR&tn=${encodeURIComponent(selectedPlan?.displayName ?? selectedPlan?.planType ?? 'Plan')}`;
  }, [upiId, listPrice, selectedPlan]);

  useEffect(() => {
    if (isDowngrade) setMethod('RAZORPAY');
  }, [isDowngrade, selectedPlan?.planType]);

  const confirmWithoutRazorpay = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }
    setSubmitting(true);
    try {
      const res = await paymentsService.createRazorpayOrder({
        planType: selectedPlan.planType,
        billingPeriod,
      });
      const orderData = res.data as { orderId?: string };
      if (orderData?.orderId === 'WALLET_PAID') {
        toast.success(
          isDowngrade
            ? `Downgraded to ${selectedPlan.displayName ?? selectedPlan.planType}`
            : 'Plan updated using wallet credits',
        );
        onSuccess?.();
        return;
      }
      toast.error('Unexpected response. Please try again.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not change plan'));
    } finally {
      setSubmitting(false);
    }
  };

  const payWithRazorpay = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }
    if (listPrice <= 0) {
      return confirmWithoutRazorpay();
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
        skippedRazorpay?: boolean;
      };

      if (orderData?.orderId === 'WALLET_PAID' || orderData?.skippedRazorpay) {
        toast.success(
          isDowngrade
            ? `Downgraded to ${selectedPlan.displayName ?? selectedPlan.planType}`
            : 'Plan upgraded using wallet credits!',
        );
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

    const txnError =
      method === 'UPI'
        ? validateUpiTransactionId(transactionId)
        : validateBankUtr(transactionId);
    const paidAtError = validatePaymentPaidAt(paidAt);
    const proofError = !proofUrl.trim()
      ? 'Payment screenshot / receipt is required'
      : null;

    const nextErrors = {
      ...(txnError ? { transactionId: txnError } : {}),
      ...(paidAtError ? { paidAt: paidAtError } : {}),
      ...(proofError ? { proofUrl: proofError } : {}),
    };
    setFieldErrors(nextErrors);

    if (txnError || paidAtError || proofError) {
      toast.error(txnError || paidAtError || proofError || 'Please fix the form errors');
      return;
    }

    setSubmitting(true);
    try {
      await paymentsService.submit({
        planType: selectedPlan.planType,
        billingPeriod,
        amount: listPrice,
        transactionId: transactionId.trim().toUpperCase().replace(/\s+/g, ''),
        paymentMethod: method,
        paidAt: new Date(paidAt).toISOString(),
        proofUrl: proofUrl.trim(),
        notes:
          method === 'UPI'
            ? `Manual UPI payment to ${upiId}`
            : `Bank transfer to ${bankAccount}${ifsc ? ` / ${ifsc}` : ''}`,
      });
      toast.success(
        'Payment request created — Pending Verification. Premium activates only after Super Admin approves.',
      );
      setTransactionId('');
      setPaidAt('');
      setProofUrl('');
      setFieldErrors({});
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not submit payment proof'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleProofFile = async (file: File | null) => {
    if (!file) {
      setProofUrl('');
      setFieldErrors((prev) => ({
        ...prev,
        proofUrl: 'Payment screenshot / receipt is required',
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Proof image must be under 5MB');
      return;
    }
    setUploadingProof(true);
    try {
      const { url } = await uploadImage(file, 'receipts');
      setProofUrl(url);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.proofUrl;
        return next;
      });
      toast.success('Payment proof uploaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Proof upload failed'));
    } finally {
      setUploadingProof(false);
    }
  };

  const handlePay = () => {
    if (isDowngrade || !needsRazorpay) return confirmWithoutRazorpay();
    if (method === 'RAZORPAY') return payWithRazorpay();
    return submitManual();
  };

  return (
    <div className="space-y-5">
      {!selectedPlan ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Select an Upgrade or Downgrade plan above to continue.
        </p>
      ) : null}

      {selectedPlan && isDowngrade ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Downgrade — no Razorpay payment</p>
          <p className="mt-1 text-amber-800">
            Smaller plans are applied instantly. Unused value from your current plan goes to
            wallet credit. Razorpay is only used for upgrades.
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Switching to {selectedPlan.displayName ?? selectedPlan.planType} (
            {formatInr(listPrice)}/{billingPeriod === 'YEARLY' ? 'year' : 'month'})
          </p>
        </div>
      ) : null}

      {selectedPlan && needsRazorpay ? (
        <>
          <div>
            <p className="text-sm font-semibold text-slate-800">Choose payment method</p>
            <p className="mt-1 text-xs text-slate-500">
              Razorpay / UPI / Bank are for upgrades when payment is required.
            </p>
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
              {formatInr(listPrice)} ({selectedPlan.displayName ?? selectedPlan.planType} ·{' '}
              {billingPeriod === 'YEARLY' ? 'Yearly' : 'Monthly'})
            </span>
          </div>

          {method === 'RAZORPAY' && (
            <p className="text-sm text-slate-500">
              You will open Razorpay Checkout for this upgrade. Failed or cancelled payments
              do not change your plan.
            </p>
          )}

          {method === 'UPI' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Submit creates a <strong>Pending Verification</strong> request. Your plan does
                not upgrade until Super Admin approves.
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Smartphone className="mt-0.5 h-4 w-4 text-fleet-600" />
                <div>
                  <p className="text-xs text-slate-500">Pay to UPI ID</p>
                  <p className="font-semibold text-slate-900">{upiId || 'Not configured'}</p>
                </div>
              </div>
              <div className="text-sm text-slate-700">
                Amount: <span className="font-semibold">{formatInr(listPrice)}</span>
              </div>
              {upiLink ? (
                <a
                  href={upiLink}
                  className="inline-flex text-sm font-semibold text-fleet-600 hover:underline"
                >
                  Open UPI app
                </a>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  UPI Transaction ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={transactionId}
                  onChange={(e) => {
                    setTransactionId(e.target.value.toUpperCase());
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.transactionId;
                      return next;
                    });
                  }}
                  placeholder="e.g. TXN123456789"
                  className={`w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none focus:border-fleet-500 ${
                    fieldErrors.transactionId
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200'
                  }`}
                />
                {fieldErrors.transactionId ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.transactionId}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Payment date & time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => {
                    setPaidAt(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.paidAt;
                      return next;
                    });
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-fleet-500 ${
                    fieldErrors.paidAt ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                {fieldErrors.paidAt ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.paidAt}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Screenshot / proof <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  disabled={uploadingProof}
                  onChange={(e) => void handleProofFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600"
                />
                {uploadingProof ? (
                  <p className="mt-1 text-xs text-slate-500">Uploading…</p>
                ) : null}
                {proofUrl ? (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-fleet-600 hover:underline"
                  >
                    View uploaded proof
                  </a>
                ) : null}
                {fieldErrors.proofUrl ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.proofUrl}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">PNG/JPG/WebP, max 5MB</p>
                )}
              </div>
            </div>
          )}

          {method === 'BANK_TRANSFER' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Submit creates a <strong>Pending Verification</strong> request. Your plan does
                not upgrade until Super Admin approves.
              </div>
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
              <div className="text-sm text-slate-700">
                Amount: <span className="font-semibold">{formatInr(listPrice)}</span>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Bank UTR / reference number <span className="text-red-500">*</span>
                </label>
                <input
                  value={transactionId}
                  onChange={(e) => {
                    setTransactionId(e.target.value.toUpperCase());
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.transactionId;
                      return next;
                    });
                  }}
                  placeholder="e.g. 123456789012"
                  className={`w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none focus:border-fleet-500 ${
                    fieldErrors.transactionId
                      ? 'border-red-400 bg-red-50'
                      : 'border-slate-200'
                  }`}
                />
                {fieldErrors.transactionId ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.transactionId}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Payment date & time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => {
                    setPaidAt(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.paidAt;
                      return next;
                    });
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-fleet-500 ${
                    fieldErrors.paidAt ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
                />
                {fieldErrors.paidAt ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.paidAt}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Bank receipt / screenshot <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  disabled={uploadingProof}
                  onChange={(e) => void handleProofFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600"
                />
                {uploadingProof ? (
                  <p className="mt-1 text-xs text-slate-500">Uploading…</p>
                ) : null}
                {proofUrl ? (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-fleet-600 hover:underline"
                  >
                    View uploaded proof
                  </a>
                ) : null}
                {fieldErrors.proofUrl ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.proofUrl}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">PNG/JPG/WebP, max 5MB</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || !selectedPlan}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto ${
          isDowngrade
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-fleet-500 hover:bg-fleet-600'
        }`}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isDowngrade || !needsRazorpay ? (
          <Send className="h-4 w-4" />
        ) : method === 'RAZORPAY' ? (
          <CreditCard className="h-4 w-4" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {submitting
          ? 'Processing...'
          : !selectedPlan
            ? 'Select a plan first'
            : isDowngrade
              ? `Confirm downgrade to ${selectedPlan.displayName ?? selectedPlan.planType}`
              : !needsRazorpay
                ? 'Confirm plan change'
                : method === 'RAZORPAY'
                  ? 'Upgrade — Pay with Razorpay'
                  : 'Upgrade — Submit Payment Proof'}
      </button>
    </div>
  );
}
