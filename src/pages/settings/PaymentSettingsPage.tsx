import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Play,
  Shield,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { platformService } from '../../services/platform.service';
import { paymentsService } from '../../services/payments.service';
import { getApiErrorMessage } from '../../utils/validation';

interface PaymentRow {
  _id: string;
  amount: number;
  transactionId: string;
  status: string;
  createdAt?: string;
  companyId?: { name?: string } | string;
}

function companyLabel(row: PaymentRow): string {
  const c = row.companyId;
  if (c && typeof c === 'object' && c.name) return c.name;
  return 'Client Company';
}

function companyInitial(name: string): string {
  return (name.trim()[0] ?? 'C').toUpperCase();
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const completed = s === 'VERIFIED' || s === 'COMPLETED';
  const pending = s === 'PENDING';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        completed
          ? 'bg-emerald-100 text-emerald-800'
          : pending
            ? 'bg-amber-100 text-amber-800'
            : 'bg-slate-100 text-slate-600'
      }`}
    >
      {completed ? 'COMPLETED' : pending ? 'PENDING' : status}
    </span>
  );
}

export function PaymentSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [transactions, setTransactions] = useState<PaymentRow[]>([]);
  const [form, setForm] = useState({
    upiId: '',
    bankAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
  });

  const loadSettings = useCallback(() => {
    platformService
      .getPaymentSettings()
      .then((res) => {
        const d = res.data as Record<string, string> | null;
        if (d) {
          setForm({
            upiId: d.upiId ?? '',
            bankAccountNumber: d.bankAccountNumber ?? '',
            ifscCode: d.ifscCode ?? '',
            accountHolderName: d.accountHolderName ?? '',
          });
        }
      })
      .catch(() => {});
  }, []);

  const loadTransactions = useCallback(() => {
    paymentsService
      .list()
      .then((res) => setTransactions((res.data as PaymentRow[]) ?? []))
      .catch(() => setTransactions([]));
  }, []);

  useEffect(() => {
    loadSettings();
    loadTransactions();
  }, [loadSettings, loadTransactions]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await platformService.updatePaymentSettings(form);
      toast.success('Payment details saved successfully');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestPayment = async () => {
    if (!form.upiId?.trim()) {
      toast.error('Save UPI ID first before running a test');
      return;
    }
    setTesting(true);
    try {
      await platformService.updatePaymentSettings(form);
      toast.info(
        'Test mode: ₹1 micro-transaction will be enabled when Razorpay payout API is connected. Settings saved.',
        { autoClose: 5000 },
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Test failed'));
    } finally {
      setTesting(false);
    }
  };

  const recentRows = transactions.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Payment Configuration
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Manage your payout and settlement details. These details are shown to client
            companies when they upgrade their subscription via UPI or bank transfer.
          </p>
        </div>
        <div
          className="hidden shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fleet-50 to-sky-100 p-8 lg:flex"
          aria-hidden
        >
          <div className="relative">
            <Smartphone className="h-16 w-16 text-fleet-500/80" strokeWidth={1.25} />
            <Wallet className="absolute -bottom-1 -right-1 h-8 w-8 text-fleet-600" />
          </div>
        </div>
      </div>

      {/* Payout + side cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-lg font-semibold text-slate-900">Payout Details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Bank and UPI information for receiving subscription payments
            </p>

            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="upiId"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  UPI ID
                </label>
                <input
                  id="upiId"
                  type="text"
                  placeholder="username@upi"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-fleet-500 focus:bg-white focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="bankAccountNumber"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Bank Account Number
                  </label>
                  <input
                    id="bankAccountNumber"
                    type="text"
                    placeholder="1234567890"
                    value={form.bankAccountNumber}
                    onChange={(e) =>
                      setForm({ ...form, bankAccountNumber: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-fleet-500 focus:bg-white focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ifscCode"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    IFSC Code
                  </label>
                  <input
                    id="ifscCode"
                    type="text"
                    placeholder="SBIN0012345"
                    value={form.ifscCode}
                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-fleet-500 focus:bg-white focus:ring-2 focus:ring-fleet-500/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="accountHolderName"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Account Holder Name
                </label>
                <input
                  id="accountHolderName"
                  type="text"
                  placeholder="Rajesh Kumar"
                  value={form.accountHolderName}
                  onChange={(e) =>
                    setForm({ ...form, accountHolderName: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none focus:border-fleet-500 focus:bg-white focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-fleet-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-fleet-600 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
              >
                {saving ? 'Saving...' : 'Save Payment Details'}
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-fleet-50 p-6">
            <h3 className="font-semibold text-slate-900">Test Payment</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Verify your configuration by sending a ₹1 micro-transaction to the registered
              account.
            </p>
            <button
              type="button"
              onClick={handleTestPayment}
              disabled={testing}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Play className="h-4 w-4 fill-fleet-500 text-fleet-500" />
              {testing ? 'Sending...' : 'Send ₹1 Test'}
            </button>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-teal-800 to-teal-900 p-6 text-white">
            <h3 className="font-semibold">Fleet Security</h3>
            <p className="mt-2 text-sm leading-relaxed text-teal-100/90">
              All payment data is protected with multi-factor authentication and
              industry-standard encryption.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <Shield className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold tracking-wider text-teal-200">
                ENCRYPTED
                <br />
                END-TO-END
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          <Link
            to={ROUTES.PENDING_PAYMENTS}
            className="text-sm font-medium text-fleet-600 hover:underline"
          >
            View All History
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">TXN ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No transactions yet. Client payments will appear here.
                  </td>
                </tr>
              ) : (
                recentRows.map((row) => {
                  const name = companyLabel(row);
                  return (
                    <tr
                      key={row._id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                            {companyInitial(name)}
                          </span>
                          <span className="font-medium text-slate-900">{name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        ₹{Number(row.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {row.transactionId}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
