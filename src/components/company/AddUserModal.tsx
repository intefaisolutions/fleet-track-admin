import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { ROLES } from '../../config/constants';
import { usersService } from '../../services/users.service';
import { driversService } from '../../services/drivers.service';
import { ModalPanel } from '../ui/ModalPanel';
import {
  getApiErrorMessage,
  normalizeLicenseNumber,
  validateDrivingLicense,
  validateEmail,
  validatePhone,
} from '../../utils/validation';

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
  address: '',
  password: '',
  confirmPassword: '',
};

const initialDriver = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  licenseNumber: '',
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const handleClose = () => {
    setOwnerForm(initialOwner);
    setDriverForm(initialDriver);
    setShowPassword(false);
    setShowConfirm(false);
    setErrors({});
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

    const email = tab === 'owners' ? ownerForm.email : driverForm.email;
    const phone = tab === 'owners' ? ownerForm.phone : driverForm.phone;
    const password =
      tab === 'owners' ? ownerForm.password : driverForm.password;
    const confirmPassword =
      tab === 'owners' ? ownerForm.confirmPassword : driverForm.confirmPassword;

    const nextErrors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;
    const phoneErr = validatePhone(phone, true);
    if (phoneErr) nextErrors.phone = phoneErr;
    if (tab === 'drivers') {
      const licenseErr = validateDrivingLicense(driverForm.licenseNumber, true);
      if (licenseErr) nextErrors.licenseNumber = licenseErr;
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(Object.values(nextErrors)[0]);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      if (tab === 'owners') {
        const address = ownerForm.address.trim();
        const res = await usersService.create({
          fullName: ownerForm.fullName.trim(),
          email: ownerForm.email.trim(),
          phone: ownerForm.phone.trim(),
          ...(address ? { address } : {}),
          password: ownerForm.password,
          role: ROLES.VEHICLE_OWNER,
          companyId,
        });
        toast.success('Vehicle owner created');
        notifyWelcomeEmail(res.meta?.welcomeEmailSent);
      } else {
        const res = await driversService.create({
          fullName: driverForm.fullName.trim(),
          email: driverForm.email.trim(),
          phone: driverForm.phone.trim(),
          password: driverForm.password,
          licenseNumber: normalizeLicenseNumber(driverForm.licenseNumber),
        });
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
  const passwordValue = form.password;
  const confirmValue = form.confirmPassword;
  const inputClass = (field?: string) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
      field && errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-200 focus:border-fleet-500 focus:ring-fleet-500/20'
    }`;

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
        <form
          onSubmit={handleSubmit}
          className="max-h-[min(75dvh,calc(100vh-10rem))] space-y-4 overflow-y-auto px-4 py-5 md:px-6"
        >
          <div>
            <label className="mb-1 flex text-sm font-medium text-slate-700">
              Full Name
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              required
              value={form.fullName}
              onChange={(e) => {
                const value = e.target.value;
                if (tab === 'owners') setOwnerForm((p) => ({ ...p, fullName: value }));
                else setDriverForm((p) => ({ ...p, fullName: value }));
              }}
              placeholder="Rajesh Sharma"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1 flex text-sm font-medium text-slate-700">
              Email
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => {
                const value = e.target.value;
                if (tab === 'owners') setOwnerForm((p) => ({ ...p, email: value }));
                else setDriverForm((p) => ({ ...p, email: value }));
                setErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="rajesh@abctransport.com"
              className={inputClass('email')}
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="mb-1 flex text-sm font-medium text-slate-700">
              Phone Number
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                if (tab === 'owners') setOwnerForm((p) => ({ ...p, phone: val }));
                else setDriverForm((p) => ({ ...p, phone: val }));
                setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="9876543210"
              className={inputClass('phone')}
            />
            <FieldError message={errors.phone} />
          </div>
          {tab === 'owners' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Address
                <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={ownerForm.address}
                onChange={(e) =>
                  setOwnerForm((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="123, Gandhi Nagar, Delhi"
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
          )}
          {tab === 'drivers' && (
            <div>
              <label className="mb-1 flex text-sm font-medium text-slate-700">
                License Number
                <span className="ml-1 text-red-500">*</span>
              </label>
              <input
                required
                value={driverForm.licenseNumber}
                onChange={(e) => {
                  const value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9\s-]/g, '');
                  setDriverForm((p) => ({ ...p, licenseNumber: value }));
                  setErrors((prev) => ({ ...prev, licenseNumber: '' }));
                }}
                placeholder="DL1420110012345"
                className={inputClass('licenseNumber')}
              />
              <FieldError message={errors.licenseNumber} />
            </div>
          )}
          <div>
            <label className="mb-1 flex text-sm font-medium text-slate-700">
              Password
              <span className="ml-1 text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (tab === 'owners') setOwnerForm((p) => ({ ...p, password: value }));
                  else setDriverForm((p) => ({ ...p, password: value }));
                  setErrors((prev) => ({ ...prev, password: '', confirmPassword: '' }));
                }}
                placeholder="Set new password"
                className={`${inputClass('password')} pr-11`}
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
            <FieldError message={errors.password} />
          </div>
          <div>
            <label className="mb-1 flex text-sm font-medium text-slate-700">
              Confirm Password
              <span className="ml-1 text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (tab === 'owners') {
                    setOwnerForm((p) => ({ ...p, confirmPassword: value }));
                  } else {
                    setDriverForm((p) => ({ ...p, confirmPassword: value }));
                  }
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                placeholder="Must match password"
                className={`${inputClass('confirmPassword')} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <FieldError message={errors.confirmPassword} />
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
