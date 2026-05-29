import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { platformService } from '../../services/platform.service';
import { getApiErrorMessage } from '../../utils/validation';

export function PaymentSettingsPage() {
  const [form, setForm] = useState({
    upiId: '',
    bankAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    supportEmail: '',
    supportPhone: '',
  });

  useEffect(() => {
    platformService
      .getPaymentSettings()
      .then((res) => {
        const d = res.data as Record<string, string> | null;
        if (d) setForm((f) => ({ ...f, ...d }));
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await platformService.updatePaymentSettings(form);
      toast.success('Payment settings saved');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Payment Settings</h1>
      <p className="text-sm text-slate-500">UPI / bank details shown to clients for manual payment.</p>
      <form onSubmit={handleSave} className="space-y-3 rounded-xl border bg-white p-6">
        {Object.entries(form).map(([key, value]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium capitalize text-slate-700">
              {key.replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              value={value}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button type="submit" className="rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white">
          Save Settings
        </button>
      </form>
    </div>
  );
}
