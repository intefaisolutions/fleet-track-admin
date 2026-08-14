import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Building2,
  CreditCard,
  Eye,
  ImagePlus,
  Landmark,
  Loader2,
  Send,
  Smartphone,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import { paymentsService } from '../../services/payments.service';
import type { SubscriptionPlanRecord } from '../../services/platform.service';
import {
  subscriptionsService,
  type PlanChangePreview,
} from '../../services/subscriptions.service';
import { walletsService } from '../../services/wallets.service';
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
  const [proofPreviewUrl, setProofPreviewUrl] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [useWallet, setUseWallet] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    transactionId?: string;
    paidAt?: string;
    proofUrl?: string;
  }>({});
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTransactionId('');
    setPaidAt('');
    setProofUrl('');
    setProofPreviewUrl((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return '';
    });
    setProofFileName('');
    setFieldErrors({});
    if (proofInputRef.current) proofInputRef.current.value = '';
  }, [method]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await walletsService.getBalance();
        if (!cancelled) {
          const bal = res.data?.walletBalance ?? 0;
          setWalletBalance(bal);
          setUseWallet(bal > 0);
        }
      } catch {
        if (!cancelled) setWalletBalance(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const listPrice =
    billingPeriod === 'YEARLY'
      ? selectedPlan?.yearlyPriceInr ?? 0
      : selectedPlan?.monthlyPriceInr ?? 0;

  const isDowngrade = changeKind === 'downgrade';

  useEffect(() => {
    if (!selectedPlan?._id || isDowngrade) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    void (async () => {
      try {
        const res = await subscriptionsService.previewChange({
          newPlanId: selectedPlan._id!,
          billingPeriod,
          useWallet,
        });
        if (!cancelled) setPreview(res.data ?? null);
      } catch {
        if (!cancelled) {
          const applied = useWallet ? Math.min(walletBalance, listPrice) : 0;
          setPreview({
            newPrice: listPrice,
            walletBalanceBefore: walletBalance,
            useWallet,
            walletUsed: applied,
            amountToPay: Math.max(0, Math.round((listPrice - applied) * 100) / 100),
            paymentRequired: listPrice - applied > 0,
          });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    selectedPlan?._id,
    billingPeriod,
    useWallet,
    isDowngrade,
    walletBalance,
    listPrice,
  ]);

  const walletApplied = useWallet
    ? preview?.walletUsed ?? Math.min(walletBalance, listPrice)
    : 0;
  const amountDue = useMemo(() => {
    if (typeof preview?.amountToPay === 'number') return preview.amountToPay;
    return Math.max(0, Math.round((listPrice - walletApplied) * 100) / 100);
  }, [preview?.amountToPay, listPrice, walletApplied]);

  /** Attribute applied credits: wallet balance first, then unused current-plan value */
  const fromWalletBalance = useWallet
    ? Math.min(walletBalance, walletApplied)
    : 0;
  const fromUnusedPlanCredit = useWallet
    ? Math.max(0, Math.round((walletApplied - fromWalletBalance) * 100) / 100)
    : 0;
  const unusedPlanCreditAvailable = preview?.creditGenerated ?? 0;

  const fullyCoveredByWallet = !isDowngrade && listPrice > 0 && amountDue < 1;
  const needsExternalPayment = !isDowngrade && listPrice > 0 && amountDue >= 1;

  const upiId =
    paymentSettings.upiId?.trim() ||
    paymentSettings.defaultUpiId?.trim() ||
    '';
  const bankAccount = paymentSettings.bankAccountNumber?.trim() || '';
  const ifsc = paymentSettings.ifscCode?.trim() || '';
  const accountName = paymentSettings.accountHolderName?.trim() || '';

  const upiLink = useMemo(() => {
    if (!upiId || amountDue < 1) return '';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('FleetTrack')}&am=${amountDue}&cu=INR&tn=${encodeURIComponent(selectedPlan?.displayName ?? selectedPlan?.planType ?? 'Plan')}`;
  }, [upiId, amountDue, selectedPlan]);

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
        useWallet,
      });
      const orderData = res.data as { orderId?: string };
      if (orderData?.orderId === 'WALLET_PAID') {
        toast.success(
          isDowngrade
            ? `Downgraded to ${selectedPlan.displayName ?? selectedPlan.planType}`
            : useWallet
              ? 'Plan upgraded using wallet balance'
              : 'Plan updated successfully',
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
    if (listPrice <= 0 || fullyCoveredByWallet) {
      return confirmWithoutRazorpay();
    }

    setSubmitting(true);
    try {
      const res = await paymentsService.createRazorpayOrder({
        planType: selectedPlan.planType,
        billingPeriod,
        useWallet,
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
          description: `Upgrade to ${selectedPlan.displayName ?? selectedPlan.planType}${
            useWallet && walletApplied > 0
              ? ` (pay ${formatInr(amountDue)} after wallet)`
              : ''
          }`,
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
                useWallet,
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
        amount: amountDue,
        transactionId: transactionId.trim().toUpperCase().replace(/\s+/g, ''),
        paymentMethod: method,
        paidAt: new Date(paidAt).toISOString(),
        proofUrl: proofUrl.trim(),
        useWallet,
        notes:
          method === 'UPI'
            ? `Manual UPI payment to ${upiId}${useWallet && walletApplied > 0 ? ` · wallet ${formatInr(walletApplied)}` : ''}`
            : `Bank transfer to ${bankAccount}${ifsc ? ` / ${ifsc}` : ''}${useWallet && walletApplied > 0 ? ` · wallet ${formatInr(walletApplied)}` : ''}`,
      });
      toast.success(
        'Payment request created — Pending Verification. Premium activates only after Super Admin approves.',
      );
      setTransactionId('');
      setPaidAt('');
      setProofUrl('');
      setProofPreviewUrl((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      setProofFileName('');
      setFieldErrors({});
      if (proofInputRef.current) proofInputRef.current.value = '';
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not submit payment proof'));
    } finally {
      setSubmitting(false);
    }
  };

  const clearProof = () => {
    setProofUrl('');
    setProofPreviewUrl((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return '';
    });
    setProofFileName('');
    if (proofInputRef.current) proofInputRef.current.value = '';
    setFieldErrors((prev) => ({
      ...prev,
      proofUrl: 'Payment screenshot / receipt is required',
    }));
  };

  const handleProofFile = async (file: File | null) => {
    if (!file) {
      clearProof();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Proof image must be under 5MB');
      if (proofInputRef.current) proofInputRef.current.value = '';
      return;
    }
    setUploadingProof(true);
    const localPreview = URL.createObjectURL(file);
    setProofPreviewUrl((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return localPreview;
    });
    setProofFileName(file.name);
    try {
      const { url, viewUrl } = await uploadImage(file, 'receipts');
      setProofUrl(url);
      setProofPreviewUrl((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return viewUrl || url;
      });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.proofUrl;
        return next;
      });
      toast.success('Payment proof uploaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Proof upload failed'));
      setProofUrl('');
      setProofPreviewUrl((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
        return '';
      });
      setProofFileName('');
      if (proofInputRef.current) proofInputRef.current.value = '';
    } finally {
      setUploadingProof(false);
    }
  };

  const renderProofUpload = (label: string) => (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-600">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        ref={proofInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        disabled={uploadingProof}
        onChange={(e) => void handleProofFile(e.target.files?.[0] ?? null)}
      />

      {!proofUrl && !proofPreviewUrl ? (
        <div
          className={`rounded-xl border border-dashed px-4 py-5 ${
            fieldErrors.proofUrl
              ? 'border-red-300 bg-red-50'
              : 'border-slate-300 bg-slate-50'
          }`}
        >
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
              <ImagePlus className="h-5 w-5 text-fleet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                Upload payment screenshot
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                PNG, JPG or WebP · max 5MB
              </p>
            </div>
            <button
              type="button"
              disabled={uploadingProof}
              onClick={() => proofInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fleet-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
            >
              {uploadingProof ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadingProof ? 'Uploading…' : 'Choose file'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <img
              src={proofPreviewUrl || proofUrl}
              alt="Payment proof"
              className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover bg-white"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {proofFileName || 'Payment proof uploaded'}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                {proofUrl ? 'Ready to submit' : 'Uploading…'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={proofPreviewUrl || proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </a>
              <button
                type="button"
                disabled={uploadingProof}
                onClick={() => proofInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {uploadingProof ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Change
              </button>
              <button
                type="button"
                disabled={uploadingProof}
                onClick={clearProof}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {fieldErrors.proofUrl ? (
        <p className="mt-1.5 text-xs text-red-600">{fieldErrors.proofUrl}</p>
      ) : null}
    </div>
  );
  const handlePay = () => {
    if (isDowngrade || listPrice <= 0 || fullyCoveredByWallet) {
      return confirmWithoutRazorpay();
    }
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

      {selectedPlan && !isDowngrade && listPrice > 0 ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Wallet className="mt-0.5 h-5 w-5 text-fleet-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Payment credits</p>
                <p className="text-xs text-slate-500">
                  Current wallet (same as Wallet page):{' '}
                  <span className="font-semibold text-slate-800">{formatInr(walletBalance)}</span>
                </p>
              </div>
            </div>
            {walletBalance > 0 || unusedPlanCreditAvailable > 0 ? (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-fleet-600 focus:ring-fleet-500"
                />
                Use credits
              </label>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm">
            <div className="flex justify-between gap-3 text-slate-600">
              <span>Plan price</span>
              <span className="font-medium text-slate-900">{formatInr(listPrice)}</span>
            </div>
            {useWallet ? (
              <>
                <div className="mt-1.5 flex justify-between gap-3 text-slate-600">
                  <span>From wallet balance</span>
                  <span className="font-medium text-emerald-700">
                    {previewLoading ? '…' : `− ${formatInr(fromWalletBalance)}`}
                  </span>
                </div>
                {unusedPlanCreditAvailable > 0 || fromUnusedPlanCredit > 0 ? (
                  <div className="mt-1.5 flex justify-between gap-3 text-slate-600">
                    <span>
                      Unused current-plan credit
                      <span className="block text-[11px] font-normal text-slate-400">
                        Remaining value of your current plan — not yet shown on Wallet page
                      </span>
                    </span>
                    <span className="font-medium text-emerald-700">
                      {previewLoading ? '…' : `− ${formatInr(fromUnusedPlanCredit)}`}
                    </span>
                  </div>
                ) : null}
                <div className="mt-1.5 flex justify-between gap-3 text-slate-500">
                  <span>Total credits applied</span>
                  <span className="font-medium">
                    {previewLoading ? '…' : `− ${formatInr(walletApplied)}`}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-1.5 flex justify-between gap-3 text-slate-600">
                <span>Credits applied</span>
                <span className="font-medium text-slate-500">− {formatInr(0)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between gap-3 border-t border-slate-200 pt-2 font-semibold text-slate-900">
              <span>Amount to pay</span>
              <span className={amountDue < 1 ? 'text-emerald-700' : 'text-fleet-700'}>
                {previewLoading ? '…' : formatInr(amountDue)}
              </span>
            </div>
            {!useWallet && (walletBalance > 0 || unusedPlanCreditAvailable > 0) ? (
              <p className="mt-2 text-xs text-amber-700">
                Credits not used — you will pay the full plan price. Unused current-plan
                value still goes to wallet after the change.
              </p>
            ) : null}
            {fullyCoveredByWallet ? (
              <p className="mt-2 text-xs text-emerald-700">
                Credits cover this plan fully. No Razorpay / UPI / Bank payment needed.
              </p>
            ) : null}
            {needsExternalPayment && useWallet && walletApplied > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Pay remaining {formatInr(amountDue)} via Razorpay, UPI, or Bank Transfer.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedPlan && needsExternalPayment ? (
        <>
          <div>
            <p className="text-sm font-semibold text-slate-800">Choose payment method</p>
            <p className="mt-1 text-xs text-slate-500">
              Pay the remaining amount after wallet (if used).
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
              {formatInr(amountDue)} ({selectedPlan.displayName ?? selectedPlan.planType} ·{' '}
              {billingPeriod === 'YEARLY' ? 'Yearly' : 'Monthly'})
            </span>
            {useWallet && walletApplied > 0 ? (
              <span className="mt-1 block text-xs text-slate-500">
                Plan {formatInr(listPrice)} − credits {formatInr(walletApplied)}
                {fromUnusedPlanCredit > 0
                  ? ` (wallet ${formatInr(fromWalletBalance)} + unused plan ${formatInr(fromUnusedPlanCredit)})`
                  : ''}
              </span>
            ) : null}
          </div>

          {method === 'RAZORPAY' && (
            <p className="text-sm text-slate-500">
              You will open Razorpay Checkout for {formatInr(amountDue)}. Failed or cancelled
              payments do not change your plan.
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
                Amount: <span className="font-semibold">{formatInr(amountDue)}</span>
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
              {renderProofUpload('Screenshot / proof')}
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
                Amount: <span className="font-semibold">{formatInr(amountDue)}</span>
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
              {renderProofUpload('Bank receipt / screenshot')}
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
        ) : isDowngrade || fullyCoveredByWallet || listPrice <= 0 ? (
          <Wallet className="h-4 w-4" />
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
              : fullyCoveredByWallet
                ? `Upgrade with wallet — ${formatInr(0)} to pay`
                : listPrice <= 0
                  ? 'Confirm plan change'
                  : method === 'RAZORPAY'
                    ? `Upgrade — Pay ${formatInr(amountDue)} with Razorpay`
                    : `Upgrade — Submit proof for ${formatInr(amountDue)}`}
      </button>
    </div>
  );
}
