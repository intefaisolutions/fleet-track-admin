import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ROLES } from '../../config/constants';
import { usersService } from '../../services/users.service';
import { driversService } from '../../services/drivers.service';
import { ModalPanel } from '../ui/ModalPanel';
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

type SharedFormFields = keyof typeof initialOwner;

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
  const [showPassword, setShowPassword] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setOwnerForm(initialOwner);
    setDriverForm(initialDriver);
    setShowPassword(false);
    onClose();
  };

  const notifyWelcomeEmail = (welcomeEmailSent: unknown) => {
    if (welcomeEmailSent === true) {
      toast.info('Login details were sent to their email.');
    } else if (welcomeEmailSent === false) {
      toast.warn(
        'User created, but welcome email was not sent. Check server SMTP settings (SMTP_HOST, SMTP_USER, SMTP_PASS).',
      );
    }
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
        const res = await usersService.create({
          ...ownerForm,
          role: ROLES.VEHICLE_OWNER,
          companyId,
        });
        toast.success('Vehicle owner created');
        notifyWelcomeEmail(res.meta?.welcomeEmailSent);
      } else {
        const res = await driversService.create(driverForm);
        toast.success('Driver created');
        notifyWelcomeEmail(res.meta?.welcomeEmailSent);
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

  const updateSharedField = (field: SharedFormFields, value: string) => {
    if (tab === 'owners') {
      setOwnerForm((prev) => ({ ...prev, [field]: value }));
    } else {
      setDriverForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close"
      />
      <ModalPanel maxWidth="max-w-md">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            Add {tab === 'owners' ? 'Vehicle Owner' : 'Driver'}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[min(75dvh,calc(100vh-10rem))] space-y-4 overflow-y-auto px-4 py-5 md:px-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => updateSharedField('fullName', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => updateSharedField('email', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="tel"
              required
              minLength={10}
              maxLength={10}
              pattern="[0-9]{10}"
              title="Please enter exactly 10 digits"
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                updateSharedField('phone', val);
              }}
              placeholder="9876543210"
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => updateSharedField('password', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-11 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
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
      </ModalPanel>
    </>
  );
}
