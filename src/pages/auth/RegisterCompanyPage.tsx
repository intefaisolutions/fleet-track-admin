import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Truck } from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { companiesService } from '../../services/companies.service';
import { getApiErrorMessage } from '../../utils/validation';

export function RegisterCompanyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    licenseKey: '',
    companyName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await companiesService.register({
        licenseKey: form.licenseKey,
        companyName: form.companyName,
        adminName: form.adminName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.success('Company registered! You can login now.');
      navigate(ROUTES.SIGN_IN);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fleet-500 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Register Your Company</h1>
            <p className="text-sm text-slate-500">Enter your FleetTrack license key</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(
            [
              ['licenseKey', 'License Key', 'FLT-XXXX-YYYY-ZZZZ-WWWW'],
              ['companyName', 'Company Name', 'ABC Transport Pvt Ltd'],
              ['adminName', 'Admin Full Name', 'Ramesh Kumar'],
              ['email', 'Admin Email', 'admin@company.com'],
              ['phone', 'Admin Phone', '+919876543210'],
              ['password', 'Password', 'Min 8 characters'],
              ['confirmPassword', 'Confirm Password', ''],
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {label}
              </label>
              <input
                type={key.includes('password') ? 'password' : key === 'email' ? 'email' : 'text'}
                required
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Registering...' : 'Register Company'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to={ROUTES.SIGN_IN} className="font-medium text-fleet-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
