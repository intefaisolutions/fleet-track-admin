import { useCallback, useState, type FormEvent } from 'react';
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
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { AuthPageFooter } from '../../components/auth/AuthPageFooter';
import { AuthPageBrand } from '../../components/auth/AuthPageBrand';
import { getApiErrorMessage } from '../../utils/validation';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export function SignInPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { role, permissions, licenseNotice } = await login({ email, password });
      toast.success('Welcome back!');
      if (licenseNotice?.message) {
        toast.warn(licenseNotice.message, { autoClose: 12000 });
      }
      navigate(homeRouteForRole(role, permissions));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setGoogleLoading(true);
      try {
        const { role, permissions, licenseNotice } = await loginWithGoogle(idToken);
        toast.success('Signed in with Google');
        if (licenseNotice?.message) {
          toast.warn(licenseNotice.message, { autoClose: 12000 });
        }
        navigate(homeRouteForRole(role, permissions));
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Google sign-in failed'));
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, navigate],
  );

  return (
    <div className="flex min-h-screen">
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
            <div className="absolute -top-3 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md">
              <MapPin className="h-5 w-5" style={{ color: '#00AEEF' }} fill="#00AEEF" />
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

      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-14 lg:px-20">
          <AuthPageBrand />

          <div className="mx-auto w-full max-w-md">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h2>
            <p className="mt-2 text-sm text-slate-500">
              Log in to manage your fleet operations.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
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
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
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

            <GoogleSignInButton
              clientId={GOOGLE_CLIENT_ID}
              disabled={loading || googleLoading}
              onCredential={handleGoogleCredential}
            />

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

        <AuthPageFooter />
      </div>
    </div>
  );
}
