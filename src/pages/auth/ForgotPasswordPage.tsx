import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  CircleHelp,
  Globe,
  Lock,
  Mail,
  Send,
  Truck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ROUTES } from '../../config/constants';
import { authService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/validation';

type Step = 1 | 2 | 3;

const STEPS: { num: Step; label: string }[] = [
  { num: 1, label: 'Email' },
  { num: 2, label: 'Verify' },
  { num: 3, label: 'New' },
];

function OtpEnvelopeIllustration() {
  return (
    <div className="relative mx-auto mb-6 h-28 w-40" aria-hidden>
      <div className="absolute inset-x-4 bottom-0 h-20 rounded-b-lg rounded-t-sm border-2 border-slate-200 bg-white shadow-md">
        <div className="absolute -top-8 left-1/2 h-16 w-24 -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-slate-200 bg-slate-50" />
        <div className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-1">
          <Truck className="h-4 w-4 text-fleet-500" />
          <span className="text-[10px] font-bold text-fleet-600">FleetTrack</span>
        </div>
      </div>
      <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-lg bg-fleet-500 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-white shadow-lg">
        {'1203456'.split('').map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 px-4 py-5">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                current >= s.num
                  ? 'bg-fleet-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s.num}
            </div>
            <span
              className={`mt-1 text-xs font-medium ${
                current >= s.num ? 'text-fleet-600' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-3 mb-4 h-0.5 w-12 sm:w-16 ${
                current > s.num ? 'bg-fleet-500' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpValue = otp.join('');

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      const data = res.data as { otp?: string } | undefined;
      toast.success('OTP sent to your email if the account exists');
      if (data?.otp) {
        toast.info(`Dev OTP: ${data.otp}`, { autoClose: 15000 });
        setOtp(data.otp.split('').slice(0, 6));
      }
      setStep(2);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not send OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      toast.error('Enter the full 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyResetOtp(email.trim(), otpValue);
      toast.success('OTP verified');
      setStep(3);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword({
        email: email.trim(),
        token: otpValue,
        password,
      });
      toast.success('Password updated. Please sign in.');
      navigate(ROUTES.SIGN_IN);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Reset failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* Top bar */}
      <header className="flex items-center justify-between bg-[#1a2b4a] px-6 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fleet-500">
            <Truck className="h-4 w-4" />
          </div>
          <span className="font-semibold">FleetTrack</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Help"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-white/80 hover:bg-white/10"
            aria-label="Language"
          >
            <Globe className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <OtpEnvelopeIllustration />

        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="bg-gradient-to-r from-fleet-500 to-fleet-600 px-6 py-5 text-center text-white">
            <h1 className="text-xl font-bold">Forgot Password</h1>
            <p className="mt-1 text-sm text-white/90">
              Provide your email to recover your account.
            </p>
          </div>

          <StepIndicator current={step} />

          <div className="px-6 pb-8">
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. manager@fleettrack.com"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-fleet-500 py-3.5 text-sm font-semibold text-white transition hover:bg-fleet-600 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <p className="text-center text-sm text-slate-500">
                  Enter the 6-digit code sent to{' '}
                  <span className="font-medium text-slate-700">{email}</span>
                </p>
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-12 w-10 rounded-lg border border-slate-200 text-center text-lg font-semibold outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20 sm:w-12"
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-fleet-500 py-3.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-fleet-600 hover:underline"
                >
                  Resend OTP
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-11 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-fleet-500 py-3.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
                >
                  {loading ? 'Saving...' : 'Set New Password'}
                </button>
              </form>
            )}

            <Link
              to={ROUTES.SIGN_IN}
              className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 hover:text-fleet-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>

        <p className="mt-6 max-w-md text-center text-xs text-slate-500">
          If you no longer have access to your email, please reach out to our system
          administrator for manual recovery.
        </p>
      </main>

      <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-700">FleetTrack</p>
          <p>© 2024 FleetTrack Logistics Solutions. All rights reserved.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button type="button" className="hover:text-slate-700">
            Privacy Policy
          </button>
          <button type="button" className="hover:text-slate-700">
            Terms of Service
          </button>
          <button type="button" className="hover:text-slate-700">
            Contact Support
          </button>
        </div>
      </footer>
    </div>
  );
}
