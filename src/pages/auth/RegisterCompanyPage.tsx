import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Truck,
  User,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { companiesService } from '../../services/companies.service';
import { getApiErrorMessage } from '../../utils/validation';

function FleetIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
        <div className="relative mx-auto h-40 w-56">
          {/* Building */}
          <div className="absolute bottom-0 left-1/2 h-28 w-36 -translate-x-1/2 rounded-t-lg bg-white/90 shadow-lg">
            <div className="grid grid-cols-3 gap-2 p-3 pt-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-4 rounded-sm bg-sky-200/80" />
              ))}
            </div>
            <div className="absolute bottom-0 left-1/2 h-8 w-10 -translate-x-1/2 rounded-t-md bg-slate-700/80" />
          </div>
          {/* Trucks */}
          <div className="absolute bottom-2 left-2 flex items-end gap-1">
            <div className="flex h-10 w-16 items-end rounded-md bg-white shadow-md">
              <Truck className="h-8 w-full text-fleet-600" strokeWidth={1.5} />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 flex items-end">
            <div className="flex h-12 w-20 items-end rounded-md bg-white shadow-md">
              <Truck className="h-10 w-full text-fleet-700" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterCompanyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    licenseKey: '',
    companyName: '',
    adminName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await companiesService.register({
        licenseKey: form.licenseKey.trim(),
        companyName: form.companyName.trim(),
        adminName: form.adminName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
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
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Left panel */}
        <div
          className="relative hidden w-[42%] flex-col items-center justify-center px-10 lg:flex"
          style={{ backgroundColor: '#00AEEF' }}
        >
          <FleetIllustration />
          <h1 className="mt-10 max-w-sm text-center text-3xl font-bold leading-snug tracking-tight text-white">
            Scale Your Operations with Ease.
          </h1>
          <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-white/90">
            Join thousands of fleet operators managing real-time logistics with
            FleetTrack precision.
          </p>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-1 flex-col bg-white">
          <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-14 lg:px-20">
            <div className="mx-auto w-full max-w-md">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Register Your Company
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Get started with your dedicated logistics dashboard.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="licenseKey"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    License Key
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="licenseKey"
                      required
                      value={form.licenseKey}
                      onChange={(e) => setForm({ ...form, licenseKey: e.target.value })}
                      placeholder="Enter valid license key"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="companyName"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="companyName"
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="e.g. Global Logistics Inc."
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="adminName"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Admin Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="adminName"
                      required
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      placeholder="John Doe"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="admin@company.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min 8 characters"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm({ ...form, confirmPassword: e.target.value })
                      }
                      placeholder="Re-enter password"
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: '#00AEEF' }}
                >
                  {loading ? 'Registering...' : 'Register'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already registered?{' '}
                <Link
                  to={ROUTES.SIGN_IN}
                  className="font-semibold hover:underline"
                  style={{ color: '#00AEEF' }}
                >
                  Login
                </Link>
              </p>
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t border-slate-100 px-8 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-14 lg:px-20">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: '#00AEEF' }}
              >
                <Truck className="h-4 w-4" />
              </div>
              <span className="font-semibold text-slate-600">FleetTrack</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <button type="button" className="hover:text-slate-600">
                Privacy Policy
              </button>
              <button type="button" className="hover:text-slate-600">
                Terms of Service
              </button>
              <button type="button" className="hover:text-slate-600">
                Contact Support
              </button>
            </div>
            <p className="sm:text-right">
              © 2024 FleetTrack Technologies. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
