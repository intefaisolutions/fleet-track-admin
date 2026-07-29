import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Building2,
  HelpCircle,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { AuthPageBrand } from '../../components/auth/AuthPageBrand';
import { AuthPageFooter } from '../../components/auth/AuthPageFooter';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import {
  companiesService,
  type LicenseActivationStatus,
} from '../../services/companies.service';
import { getApiErrorMessage } from '../../utils/validation';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() ?? '';
const LICENSE_KEY_PATTERN = /^FLT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function extractResendCooldown(err: unknown): number | null {
  if (
    !err ||
    typeof err !== 'object' ||
    !('response' in err) ||
    !err.response ||
    typeof err.response !== 'object' ||
    !('data' in err.response) ||
    !err.response.data ||
    typeof err.response.data !== 'object'
  ) {
    return null;
  }
  const data = err.response.data as {
    data?: { resendCooldownSeconds?: number };
    resendCooldownSeconds?: number;
  };
  const seconds =
    data.data?.resendCooldownSeconds ?? data.resendCooldownSeconds ?? null;
  return typeof seconds === 'number' && seconds > 0 ? seconds : null;
}

function validateLicenseKeyInput(value: string): string | null {
  const key = value.trim();
  if (!key) {
    return 'License key is required.';
  }
  if (key.length < 10) {
    return 'License key is too short. Please paste the full key from your email.';
  }
  if (!LICENSE_KEY_PATTERN.test(key)) {
    return 'Invalid format. Expected FLT-XXXX-YYYY-ZZZZ-WWWW.';
  }
  return null;
}

function ButtonSpinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </span>
  );
}

export function LicenseActivationPage() {
  const { user, logout, markLicenseActivated } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LicenseActivationStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const startCooldown = (seconds: number) => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    const initial = Math.max(0, Math.ceil(seconds));
    setCooldownSeconds(initial);
    if (initial <= 0) return;

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingStatus(true);
    setStatusError('');
    companiesService
      .getLicenseActivationStatus()
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (data) {
          setStatus(data);
          if (!data.requiresActivation) {
            markLicenseActivated();
          }
          if (data.resendCooldownSeconds && data.resendCooldownSeconds > 0) {
            startCooldown(data.resendCooldownSeconds);
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = getApiErrorMessage(
            err,
            'Failed to load license verification status.',
          );
          setStatusError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [markLicenseActivated]);

  useEffect(() => {
    if (!loadingStatus && status?.requiresActivation) {
      inputRef.current?.focus();
    }
  }, [loadingStatus, status?.requiresActivation]);

  if (loadingStatus) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: '#00AEEF', borderTopColor: 'transparent' }}
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm text-slate-500">Loading license verification…</p>
      </div>
    );
  }

  if (status && !status.requiresActivation) {
    return <Navigate to={ROUTES.COMPANY_DASHBOARD} replace />;
  }

  const companyName = status?.companyName ?? 'Your company';
  const maskedEmail = status?.maskedEmail ?? user?.email ?? '***@***';
  const busy = submitting || resending || loggingOut;
  const resendDisabled = busy || cooldownSeconds > 0;

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateLicenseKeyInput(licenseKey);
    if (validationError) {
      setFieldError(validationError);
      inputRef.current?.focus();
      return;
    }
    setFieldError('');
    setSubmitting(true);
    try {
      const res = await companiesService.activateLicense(licenseKey.trim());
      toast.success(
        res.message ||
          'Your license key has been verified successfully. Welcome to FleetTrack!',
      );
      markLicenseActivated();
      navigate(ROUTES.COMPANY_DASHBOARD, { replace: true });
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        'Invalid license key. Please check and try again.',
      );
      setFieldError(message);
      toast.error(message);
      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;
    setResending(true);
    try {
      const res = await companiesService.resendLicenseEmail();
      toast.success(
        res.message ||
          `License key has been resent to ${maskedEmail}.`,
      );
      const nextCooldown =
        res.data?.resendCooldownSeconds && res.data.resendCooldownSeconds > 0
          ? res.data.resendCooldownSeconds
          : 60;
      startCooldown(nextCooldown);
    } catch (err: unknown) {
      const cooldownFromError = extractResendCooldown(err);
      if (cooldownFromError) {
        startCooldown(cooldownFromError);
      }
      toast.error(getApiErrorMessage(err, 'Failed to resend license email.'));
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.SIGN_IN, { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleContactSupport = () => {
    if (SUPPORT_EMAIL) {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        'License key verification help',
      )}&body=${encodeURIComponent(
        `Hello Support,\n\nI need help verifying my company license.\nCompany: ${companyName}\nEmail: ${maskedEmail}\n\nThank you.`,
      )}`;
      return;
    }
    toast.info('Please contact your service provider for license assistance.');
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — matches Sign In */}
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
              <ShieldCheck className="h-14 w-14 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-3 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md">
              <KeyRound className="h-5 w-5" style={{ color: '#00AEEF' }} />
            </div>
          </div>
          <h1 className="max-w-xs text-3xl font-bold leading-snug tracking-tight text-white">
            Verify Your
            <br />
            Company License
          </h1>
          <p className="mt-4 max-w-xs text-sm text-white/85">
            Enter the license key sent to your registered email to unlock your
            fleet dashboard.
          </p>
        </div>
        <div className="absolute bottom-8 left-8 flex items-center gap-2 text-sm text-white/90">
          <Truck className="h-4 w-4" />
          <MapPin className="h-4 w-4" />
          <span>Secure company activation</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-white">
        <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-14 lg:px-20">
          <div className="mx-auto w-full max-w-md">
            <div className="flex items-start justify-between gap-4">
              <AuthPageBrand />
              <button
                type="button"
                onClick={handleLogout}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {loggingOut ? (
                  <ButtonSpinner label="Logging out…" />
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#00AEEF]/10 lg:hidden">
              <ShieldCheck className="h-6 w-6 text-[#00AEEF]" />
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              License Verification
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter the license key sent to your registered email to verify your
              company account before accessing the dashboard.
            </p>

            {statusError ? (
              <div
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {statusError}
              </div>
            ) : null}

            {/* Masked email + company */}
            <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Company
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {companyName}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Registered email
                  </p>
                  <p
                    className="font-mono text-sm font-semibold tracking-wide text-slate-800"
                    aria-label={`Masked email ${maskedEmail}`}
                  >
                    {maskedEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              A license key was sent to <strong>{maskedEmail}</strong>. Check
              your inbox and spam folder if you do not see it.
            </div>

            {/* License input + Verify */}
            <form onSubmit={handleVerify} className="mt-6 space-y-5" noValidate>
              <div>
                <label
                  htmlFor="licenseKey"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  License Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={inputRef}
                    id="licenseKey"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={!!fieldError}
                    aria-describedby={
                      fieldError ? 'licenseKey-error' : 'licenseKey-hint'
                    }
                    disabled={busy}
                    value={licenseKey}
                    onChange={(e) => {
                      setLicenseKey(e.target.value.toUpperCase());
                      if (fieldError) setFieldError('');
                    }}
                    placeholder="FLT-XXXX-YYYY-ZZZZ-WWWW"
                    className={`w-full rounded-lg border bg-white py-3 pl-11 pr-4 font-mono text-sm text-slate-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-[#00AEEF]/20 disabled:bg-slate-50 disabled:opacity-70 ${
                      fieldError
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-slate-200 focus:border-[#00AEEF]'
                    }`}
                  />
                </div>
                {fieldError ? (
                  <p
                    id="licenseKey-error"
                    className="mt-1.5 text-sm text-red-600"
                    role="alert"
                  >
                    {fieldError}
                  </p>
                ) : (
                  <p id="licenseKey-hint" className="mt-1.5 text-xs text-slate-400">
                    Paste the key exactly as received (format:{' '}
                    <span className="font-mono">FLT-XXXX-YYYY-ZZZZ-WWWW</span>).
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                style={{ backgroundColor: '#00AEEF' }}
              >
                {submitting ? (
                  <ButtonSpinner label="Verifying…" />
                ) : (
                  'Verify License Key'
                )}
              </button>
            </form>

            {/* Resend + Contact Support */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? (
                  <ButtonSpinner label="Sending…" />
                ) : (
                  <>
                    <Mail className="h-4 w-4 text-[#00AEEF]" />
                    {cooldownSeconds > 0
                      ? `Resend Email (${cooldownSeconds}s)`
                      : 'Resend Email'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleContactSupport}
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <HelpCircle className="h-4 w-4 text-slate-500" />
                Contact Support
              </button>
            </div>

            {cooldownSeconds > 0 ? (
              <p className="mt-2 text-center text-xs text-slate-400">
                You can request another email in {cooldownSeconds}s.
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-slate-400">
                Didn&apos;t receive the key? Use Resend Email or Contact Support.
              </p>
            )}
          </div>
        </div>
        <AuthPageFooter />
      </div>
    </div>
  );
}
