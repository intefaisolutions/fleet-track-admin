import { useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { X } from 'lucide-react';
import { companiesService } from '../../services/companies.service';
import { getApiErrorMessage } from '../../utils/validation';

export const COMPANY_SUB_ADMIN_PERMISSIONS = [
  { value: 'users:read', label: 'View Users' },
  { value: 'users:write', label: 'Edit Users' },
  { value: 'users:delete', label: 'Delete Users' },
  { value: 'expenses:read', label: 'View Expenses' },
  { value: 'expenses:write', label: 'Edit Expenses' },
  { value: 'expenses:delete', label: 'Delete Expenses' },
  { value: 'vehicles:read', label: 'View Vehicles' },
  { value: 'vehicles:write', label: 'Edit Vehicles' },
] as const;

export function permissionLabel(key: string) {
  return (
    COMPANY_SUB_ADMIN_PERMISSIONS.find((p) => p.value === key)?.label ?? key
  );
}

export function AddSubAdminModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    permissions: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const togglePermission = (value: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(value)
        ? f.permissions.filter((p) => p !== value)
        : [...f.permissions, value],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.permissions.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setLoading(true);
    try {
      await companiesService.addSubAdmin(form);
      toast.success('Sub-admin invited');
      setForm({ name: '', email: '', permissions: [] });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to add sub-admin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Create Sub-Admin</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              required
              placeholder="e.g. Payal Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. payal@abc.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Set Permissions</p>
            <p className="mb-2 text-xs text-slate-500">
              Choose what this sub-admin can view, edit, or delete.
            </p>
            <div className="flex flex-wrap gap-2">
              {COMPANY_SUB_ADMIN_PERMISSIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePermission(p.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    form.permissions.includes(p.value)
                      ? 'bg-sky-500 text-white'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
          >
            {loading ? 'Sending invite...' : 'Add Sub-Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
