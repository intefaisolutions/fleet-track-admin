import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { paymentsService } from '../../services/payments.service';
import { getApiErrorMessage } from '../../utils/validation';

export function PendingPaymentsPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  const load = () => {
    paymentsService
      .list('PENDING')
      .then((res) => setItems((res.data as Record<string, unknown>[]) ?? []))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load')));
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (id: string) => {
    try {
      await paymentsService.verify(id);
      toast.success('Payment verified');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Verify failed'));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Pending Payments</h1>
      <p className="text-sm text-slate-500">Verify manual UPI/bank payments from companies.</p>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-slate-400">No pending payments</p>
        ) : (
          items.map((p) => (
            <div
              key={String(p._id)}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div>
                <p className="font-medium">₹{String(p.amount)} — {String(p.planType)}</p>
                <p className="text-xs text-slate-500">TXN: {String(p.transactionId)}</p>
              </div>
              <button
                type="button"
                onClick={() => verify(String(p._id))}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white"
              >
                Verify
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
