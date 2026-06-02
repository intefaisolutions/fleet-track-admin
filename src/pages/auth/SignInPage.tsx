import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Truck,
  MapPin,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROUTES, homeRouteForRole } from '../../config/constants';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AzureIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#0078D4" d="M12 2L2 19h10l-1.5-5.5L12 2z" />
      <path fill="#50E6FF" d="M12 2l7 11.5L12 19V2z" opacity="0.85" />
    </svg>
  );
}

export function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { role, permissions } = await login({ email, password });
      toast.success('Welcome back!');
      navigate(homeRouteForRole(role, permissions));
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
          ? String((err.response.data as { message: string }).message)
          : err instanceof Error
            ? err.message
            : 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — Figma decorative */}
      <div
        className="relative hidden w-[42%] flex-col items-center justify-center px-10 lg:flex"
        style={{ backgroundColor: '#00AEEF' }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-2xl shadow-lg"
              style={{ backgroundColor: '#0096D6' }}
            >
              <Truck className="h-14 w-14 text-white" strokeWidth={1.5} />
            </div>
            <div
              className="absolute -top-3 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md"
            >
              <MapPin
                className="h-5 w-5"
                style={{ color: '#00AEEF' }}
                fill="#00AEEF"
              />
            </div>
          </div>

          <h1 className="max-w-xs text-3xl font-bold leading-snug tracking-tight text-white">
            Track Every Mile,
            <br />
            Every Expense
          </h1>
        </div>

        <div className="absolute bottom-8 left-8 flex items-center gap-2 text-sm text-white/90">
          <ShieldCheck className="h-4 w-4" />
          <span>Industrial Grade Precision</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-14 lg:px-20">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: '#00AEEF' }}
            >
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-900">FleetTrack</span>
          </div>

          <div className="mx-auto w-full max-w-md">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Log in to manage your fleet operations.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <Link
                    to={ROUTES.FORGOT_PASSWORD}
                    className="text-sm font-medium hover:underline"
                    style={{ color: '#00AEEF' }}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                style={{ backgroundColor: '#00AEEF' }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider text-slate-400">
                <span className="bg-white px-3">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toast.info('Google sign-in — coming soon')}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                type="button"
                onClick={() => toast.info('Azure AD sign-in — coming soon')}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <AzureIcon />
                Azure AD
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                to={ROUTES.REGISTER_COMPANY}
                className="font-semibold hover:underline"
                style={{ color: '#00AEEF' }}
              >
                Register Your Company
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-slate-100 px-8 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-14 lg:px-20">
          <p>© 2024 FleetStream Logistics. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <button type="button" className="hover:text-slate-600">
              Privacy Policy
            </button>
            <button type="button" className="hover:text-slate-600">
              Terms of Service
            </button>
            <button type="button" className="hover:text-slate-600">
              System Status
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
