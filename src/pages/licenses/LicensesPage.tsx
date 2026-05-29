import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { licensesService } from '../../services/licenses.service';
import { getApiErrorMessage } from '../../utils/validation';

const PLAN_TYPES = ['FREE', 'BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];

export function LicensesPage() {
  const [licenses, setLicenses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    intendedCompanyName: '',
    contactEmail: '',
    planType: 'PREMIUM',
    validUntil: '',
    maxVehicles: '50',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await licensesService.list();
      setLicenses((res.data as Record<string, unknown>[]) ?? []);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load licenses'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await licensesService.create({
        intendedCompanyName: form.intendedCompanyName || undefined,
        contactEmail: form.contactEmail || undefined,
        planType: form.planType,
        validUntil: new Date(form.validUntil).toISOString(),
        maxVehicles: Number(form.maxVehicles),
      });
      toast.success('License generated');
      const created = res.data as Record<string, unknown>;
      if (created?.licenseKey) {
        toast.info(`Key: ${String(created.licenseKey)}`, { autoClose: 10000 });
      }
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create license'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">License Keys</h1>
        <p className="text-sm text-slate-500">
          Generate and manage license keys for client companies (SRS core feature).
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <h2 className="md:col-span-2 text-lg font-semibold text-slate-800">
          Create New License
        </h2>
        <input
          placeholder="Company name (optional)"
          value={form.intendedCompanyName}
          onChange={(e) => setForm({ ...form, intendedCompanyName: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Contact email (optional)"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={form.planType}
          onChange={(e) => setForm({ ...form, planType: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {PLAN_TYPES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          required
          value={form.validUntil}
          onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          placeholder="Max vehicles"
          value={form.maxVehicles}
          onChange={(e) => setForm({ ...form, maxVehicles: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white md:col-span-2"
        >
          Generate License
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">License Key</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Valid Until</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : licenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No licenses yet
                </td>
              </tr>
            ) : (
              licenses.map((l) => (
                <tr key={String(l._id)} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{String(l.licenseKey)}</td>
                  <td className="px-4 py-3">{String(l.planType)}</td>
                  <td className="px-4 py-3">{String(l.status)}</td>
                  <td className="px-4 py-3">
                    {l.validUntil
                      ? new Date(String(l.validUntil)).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
