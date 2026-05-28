import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Truck } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { ROUTES } from '../../config/constants';
import {
  getApiErrorMessage,
  validateSuperAdminForm,
} from '../../utils/validation';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function SetupSuperAdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    setupSecret: '',
    fullName: 'Fleet Super Admin',
    email: '',
    phone: '',
    password: '',
  });

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-4 py-2 text-sm outline-none focus:ring-2 ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-300 focus:border-fleet-500 focus:ring-fleet-500/20'
    }`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validateSuperAdminForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the errors below');
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await authService.setupSuperAdmin(form);
      toast.success(res.message || 'Super Admin created! Please sign in.');
      navigate(ROUTES.SIGN_IN);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Setup failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-fleet-500 p-2 text-white">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Setup Super Admin</h1>
            <p className="text-sm text-slate-500">One-time only — single account</p>
          </div>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Email and phone must be unique. Same email/phone cannot be used for a company
          or another user.
        </p>

        {(
          [
            ['setupSecret', 'Setup Secret (from .env)', 'text'],
            ['fullName', 'Full Name', 'text'],
            ['email', 'Email', 'email'],
            ['phone', 'Phone', 'tel'],
            ['password', 'Password', 'password'],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {label}
              {(key === 'email' || key === 'phone' || key === 'password') && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              type={type}
              required={key !== 'fullName'}
              minLength={key === 'password' ? 8 : undefined}
              value={form[key]}
              onChange={(e) => {
                setForm({ ...form, [key]: e.target.value });
                setErrors((prev) => ({ ...prev, [key]: '' }));
              }}
              className={inputClass(key)}
            />
            <FieldError message={errors[key]} />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Create Super Admin'}
        </button>

        <p className="text-center text-sm">
          <Link to={ROUTES.SIGN_IN} className="text-fleet-600 hover:underline">
            Back to Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
