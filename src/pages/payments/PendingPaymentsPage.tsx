import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  X,
  XCircle,
} from 'lucide-react';
import { paymentsService } from '../../services/payments.service';
import { getApiErrorMessage } from '../../utils/validation';
import { formatInr } from '../../utils/currency';

type PaymentRow = {
  _id: string;
  amount: number;
  planType?: string;
  billingPeriod?: string;
  paymentMethod?: string;
  paymentGateway?: string;
  transactionId?: string;
  status?: string;
  notes?: string;
  paidAt?: string;
  proofUrl?: string;
  rejectionReason?: string;
  createdAt?: string;
  verifiedAt?: string;
  companyId?:
    | string
    | { _id?: string; name?: string; email?: string; phone?: string; planType?: string };
  submittedBy?:
    | string
    | { _id?: string; fullName?: string; email?: string; phone?: string };
};

const STATUS_FILTERS = ['', 'PENDING', 'VERIFIED', 'REJECTED'] as const;

const REJECT_REASONS = [
  'Payment not received',
  'Invalid transaction ID',
  'Amount mismatch',
  'Duplicate transaction',
  'Invalid payment proof',
] as const;

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function companyName(p: PaymentRow) {
  if (p.companyId && typeof p.companyId === 'object') {
    return p.companyId.name || '—';
  }
  return '—';
}

function adminName(p: PaymentRow) {
  if (p.submittedBy && typeof p.submittedBy === 'object') {
    return p.submittedBy.fullName || p.submittedBy.email || '—';
  }
  return '—';
}

function StatusPill({ status }: { status?: string }) {
  const s = (status || '').toUpperCase();
  if (s === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (s === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
      <Clock3 className="h-3 w-3" /> Pending
    </span>
  );
}

export function PendingPaymentsPage() {
  const [items, setItems] = useState<PaymentRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<PaymentRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    paymentsService
      .list(statusFilter || undefined)
      .then((res) => setItems((res.data as PaymentRow[]) ?? []))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load')))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const manualOnly = useMemo(
    () =>
      items.filter((p) => {
        const gw = (p.paymentGateway || '').toUpperCase();
        const method = (p.paymentMethod || '').toUpperCase();
        return (
          gw === 'MANUAL' ||
          method === 'UPI' ||
          method === 'BANK_TRANSFER'
        );
      }),
    [items],
  );

  const approve = async (id: string) => {
    setBusy(true);
    try {
      await paymentsService.verify(id);
      toast.success('Payment approved. Subscription activated.');
      setReview(null);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Approve failed'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async (id: string) => {
    const reason = (rejectReason === 'Other' ? customReason : rejectReason).trim();
    if (!reason) {
      toast.error('Select or enter a rejection reason');
      return;
    }
    setBusy(true);
    try {
      await paymentsService.reject(id, reason);
      toast.success('Payment rejected');
      setReview(null);
      setRejectReason('');
      setCustomReason('');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Reject failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payment Requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review manual UPI / Bank Transfer proofs. Approve to activate subscription; reject
          keeps the company on their current plan.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-fleet-500"
        >
          <option value="">All statuses</option>
          {STATUS_FILTERS.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {s === 'VERIFIED' ? 'Approved' : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Transaction / UTR</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : manualOnly.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No payment requests found
                  </td>
                </tr>
              ) : (
                manualOnly.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{companyName(p)}</p>
                      <p className="text-xs text-slate-500">{adminName(p)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.planType || '—'}
                      {p.billingPeriod ? (
                        <span className="block text-xs text-slate-400">
                          {p.billingPeriod}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatInr(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.paymentMethod === 'BANK_TRANSFER'
                        ? 'Bank'
                        : p.paymentMethod || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {p.transactionId || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setReview(p);
                          setRejectReason('');
                          setCustomReason('');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {p.status === 'PENDING' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {review ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/50"
            aria-label="Close"
            onClick={() => setReview(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Review payment</h2>
                <p className="text-xs text-slate-500">Manual verification before plan activation</p>
              </div>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <StatusPill status={review.status} />
                <span className="text-xs text-slate-400">
                  Submitted {formatDate(review.createdAt)}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Company</dt>
                  <dd className="font-semibold text-slate-900">{companyName(review)}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Company Admin</dt>
                  <dd className="font-semibold text-slate-900">{adminName(review)}</dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Plan</dt>
                  <dd className="font-semibold text-slate-900">
                    {review.planType} · {review.billingPeriod || 'MONTHLY'}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Amount</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatInr(Number(review.amount))}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Method</dt>
                  <dd className="font-semibold text-slate-900">
                    {review.paymentMethod === 'BANK_TRANSFER'
                      ? 'Bank Transfer'
                      : review.paymentMethod || '—'}
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Payment date</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatDate(review.paidAt || review.createdAt)}
                  </dd>
                </div>
                <div className="col-span-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-400">Transaction / UTR</dt>
                  <dd className="font-mono text-sm font-semibold text-slate-900">
                    {review.transactionId || '—'}
                  </dd>
                </div>
                {review.notes ? (
                  <div className="col-span-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <dt className="text-xs text-slate-400">Notes</dt>
                    <dd className="text-slate-700">{review.notes}</dd>
                  </div>
                ) : null}
                {review.proofUrl ? (
                  <div className="col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Screenshot / proof
                    </p>
                    <a
                      href={review.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-slate-200"
                    >
                      <img
                        src={review.proofUrl}
                        alt="Payment proof"
                        className="max-h-56 w-full object-contain bg-slate-50"
                      />
                    </a>
                  </div>
                ) : (
                  <p className="col-span-2 text-xs text-slate-400">No screenshot uploaded</p>
                )}
                {review.rejectionReason ? (
                  <div className="col-span-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-800">
                    Rejection reason: {review.rejectionReason}
                  </div>
                ) : null}
              </dl>

              {review.status === 'PENDING' ? (
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reject reason (if rejecting)
                  </p>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
                  >
                    <option value="">Select reason…</option>
                    {REJECT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {rejectReason === 'Other' ? (
                    <input
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Custom rejection reason"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReview(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Close
              </button>
              {review.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reject(review._id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Reject Payment
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void approve(review._id)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve Payment
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
