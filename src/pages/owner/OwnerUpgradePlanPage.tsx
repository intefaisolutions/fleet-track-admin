import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CheckCircle2, CreditCard, IndianRupee, QrCode, Send } from 'lucide-react';
import { paymentsService } from '../../services/payments.service';
import { getApiErrorMessage } from '../../utils/validation';

type Plan = {
  key: 'BASIC' | 'STANDARD' | 'PREMIUM';
  label: string;
  price: number;
  vehicleLimit: number;
  features: string[];
};

const PLANS: Plan[] = [
  {
    key: 'BASIC',
    label: 'Basic Plan',
    price: 299,
    vehicleLimit: 10,
    features: ['Up to 10 vehicles', 'Expense tracking', 'Owner reports'],
  },
  {
    key: 'STANDARD',
    label: 'Standard Plan',
    price: 599,
    vehicleLimit: 25,
    features: ['Up to 25 vehicles', 'Advanced reports', 'Priority support'],
  },
  {
    key: 'PREMIUM',
    label: 'Premium Plan',
    price: 999,
    vehicleLimit: 50,
    features: ['Up to 50 vehicles', 'Full analytics', 'Fast verification'],
  },
];

const UPI_ID = 'business@okhdfcbank';

export function OwnerUpgradePlanPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[0]);
  const [transactionId, setTransactionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const upiLink = useMemo(
    () =>
      `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('FleetTrack')}&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(selectedPlan.label)}`,
    [selectedPlan],
  );

  const submitPayment = async () => {
    if (transactionId.trim().length < 6) {
      toast.error('Please enter a valid transaction ID');
      return;
    }

    setSaving(true);
    try {
      await paymentsService.submit({
        planType: selectedPlan.key,
        amount: selectedPlan.price,
        paymentMethod: 'UPI',
        transactionId: transactionId.trim(),
        upiId: UPI_ID,
        notes: `Owner upgrade to ${selectedPlan.label}`,
      });
      setSubmitted(true);
      toast.success('Payment submitted. Company Owner will verify shortly.');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not submit payment right now'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Upgrade Plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          5/5 vehicles used? Upgrade your plan to add more vehicles and continue operations.
        </p>
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Vehicle limit reached</p>
        <p className="mt-1">5/5 vehicles used - Upgrade to add more.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const active = selectedPlan.key === plan.key;
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => setSelectedPlan(plan)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? 'border-fleet-500 bg-fleet-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-fleet-300'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{plan.label}</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-bold text-slate-900">
                <IndianRupee className="h-4 w-4" />
                {plan.price}
              </p>
              <p className="mt-1 text-xs text-slate-500">Up to {plan.vehicleLimit} vehicles</p>
              <ul className="mt-3 space-y-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-xs text-slate-600">
                    - {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Payment Instructions</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-slate-700">
            <li>Select your desired plan above.</li>
            <li>Pay using PhonePe/Google Pay to the UPI ID below.</li>
            <li>Return here and tap "I Have Paid" with transaction ID.</li>
            <li>Company Owner verifies payment and your plan gets upgraded.</li>
          </ol>

          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">UPI ID</p>
            <p className="font-semibold text-slate-900">{UPI_ID}</p>
            <p className="mt-2 text-xs text-slate-500">Amount</p>
            <p className="font-semibold text-slate-900">Rs {selectedPlan.price} ({selectedPlan.label})</p>
          </div>

          <a
            href={upiLink}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-fleet-200 bg-fleet-50 px-3 py-2 text-sm font-semibold text-fleet-700 hover:bg-fleet-100"
          >
            <QrCode className="h-4 w-4" />
            Open UPI App
          </a>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">I Have Paid</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your UPI transaction ID.</p>

          <div className="mt-3 space-y-3">
            <input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
              placeholder="TXN123456789"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm uppercase"
            />
            <button
              type="button"
              onClick={submitPayment}
              disabled={saving || submitted}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Submitting...' : submitted ? 'Submitted' : 'I Have Paid'}
            </button>
          </div>

          {submitted && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> Payment submitted successfully.
              </p>
              <p className="mt-1 text-xs">
                Company Owner will verify bank statement and your plan will update automatically.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Flow Summary</p>
            <ul className="mt-1 space-y-1">
              <li>1. Limit reached - tap Upgrade Plan</li>
              <li>2. Select plan - pay via UPI</li>
              <li>3. Enter transaction ID - submit</li>
              <li>4. Company Owner verifies - plan updated</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
