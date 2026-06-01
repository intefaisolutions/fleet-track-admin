import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ROLES } from '../../config/constants';
import { usersService } from '../../services/users.service';
import { driversService } from '../../services/drivers.service';
import { getApiErrorMessage } from '../../utils/validation';

type Tab = 'owners' | 'drivers';

interface AddUserModalProps {
  open: boolean;
  tab: Tab;
  companyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const initialOwner = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
};

const initialDriver = {
  ...initialOwner,
  licenseNumber: '',
};

export function AddUserModal({
  open,
  tab,
  companyId,
  onClose,
  onSuccess,
}: AddUserModalProps) {
  const [ownerForm, setOwnerForm] = useState(initialOwner);
  const [driverForm, setDriverForm] = useState(initialDriver);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setOwnerForm(initialOwner);
    setDriverForm(initialDriver);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Company context missing');
      return;
    }
    setLoading(true);
    try {
      if (tab === 'owners') {
        await usersService.create({
          ...ownerForm,
          role: ROLES.VEHICLE_OWNER,
          companyId,
        });
        toast.success('Vehicle owner created');
      } else {
        await driversService.create(driverForm);
        toast.success('Driver created');
      }
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Create failed'));
    } finally {
      setLoading(false);
    }
  };

  const form = tab === 'owners' ? ownerForm : driverForm;
  const setForm = tab === 'owners' ? setOwnerForm : setDriverForm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Add {tab === 'owners' ? 'Vehicle Owner' : 'Driver'}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 9876543210"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          {tab === 'drivers' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                License Number
              </label>
              <input
                required
                value={driverForm.licenseNumber}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, licenseNumber: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Temporary Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-fleet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
