import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import {
  licensesService,
  type LicenseValidateResult,
} from '../../services/licenses.service';
import { AuthPageFooter } from '../../components/auth/AuthPageFooter';
import { AuthPageBrand } from '../../components/auth/AuthPageBrand';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { getApiErrorMessage } from '../../utils/validation';
import { decodeGoogleJwt } from '../../utils/googleJwt';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [licensePreview, setLicensePreview] = useState<LicenseValidateResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [form, setForm] = useState({
    licenseKey: '',
    companyName: '',
    adminName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [lockedEmail, setLockedEmail] = useState('');
  const [suggestedCompanyName, setSuggestedCompanyName] = useState('');

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#00AEEF] focus:ring-2 focus:ring-[#00AEEF]/20';
  const requiredAsterisk = <span className="ml-1 text-red-500">*</span>;

  useEffect(() => {
    const key = searchParams.get('licenseKey')?.trim() ?? '';
    const email = searchParams.get('email')?.trim() ?? '';
    const company = searchParams.get('companyName')?.trim() ?? '';
    const phone = searchParams.get('phone')?.trim() ?? '';

    if (!key && !email && !company && !phone) return;

    setForm((prev) => ({
      ...prev,
      licenseKey: key || prev.licenseKey,
      email: email || prev.email,
      companyName: company || prev.companyName,
      phone: phone || prev.phone,
    }));
    if (email) setLockedEmail(email);
    if (company) setSuggestedCompanyName(company);
  }, [searchParams]);

  const effectiveCompanyName = useMemo(
    () => form.companyName.trim() || suggestedCompanyName.trim(),
    [form.companyName, suggestedCompanyName],
  );

  const fromInvitation = useMemo(
    () => !!searchParams.get('licenseKey')?.trim(),
    [searchParams],
  );

  const usingGoogle = Boolean(googleIdToken);

  const handleGoogleCredential = useCallback(
    (idToken: string) => {
      setGoogleLoading(true);
      try {
        const profile = decodeGoogleJwt(idToken);
        const googleEmail = profile.email?.trim().toLowerCase() ?? '';

        if (lockedEmail && googleEmail && lockedEmail.toLowerCase() !== googleEmail) {
          toast.error('Google email must match the license invitation email');
          return;
        }

        setGoogleIdToken(idToken);
        setForm((prev) => ({
          ...prev,
          email: googleEmail || prev.email,
          adminName: profile.name?.trim() || prev.adminName,
        }));

        toast.success('Google account linked — verify license and complete registration');
      } finally {
        setGoogleLoading(false);
      }
    },
    [lockedEmail],
  );

  const handleVerifyLicense = async () => {
    const key = form.licenseKey.trim();
    if (!key) {
      toast.error('Enter a license key first');
      return;
    }
    setVerifying(true);
    setLicenseVerified(false);
    setLicensePreview(null);
    try {
      const res = await licensesService.validateKey(key);
      const preview = res.data as LicenseValidateResult | undefined;
      if (!preview?.valid) {
        toast.error(preview?.message ?? 'Invalid license key');
        return;
      }
      setLicensePreview(preview);
      if (preview.intendedCompanyName) {
        setSuggestedCompanyName(preview.intendedCompanyName);
        setForm((prev) => ({
          ...prev,
          companyName: prev.companyName || preview.intendedCompanyName || '',
        }));
      }
      if (preview.contactEmail) {
        setLockedEmail(preview.contactEmail);
        setForm((prev) => ({ ...prev, email: preview.contactEmail || prev.email }));
      }
      setLicenseVerified(true);
      toast.success('License key verified');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not verify license key'));
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const prefilledKey = searchParams.get('licenseKey')?.trim();
    if (!prefilledKey) return;
    if (licenseVerified || verifying) return;
    if (form.licenseKey.trim() !== prefilledKey) return;
    void handleVerifyLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.licenseKey, licenseVerified, verifying, searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!licenseVerified) {
      toast.error('Please verify your license key before registering');
      return;
    }
    if (!acceptedLegal) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return;
    }
    if (!usingGoogle) {
      if (form.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }
    if (!effectiveCompanyName) {
      toast.error('Company name missing in license. Please enter company name.');
      return;
    }
    setLoading(true);
    try {
      await companiesService.register({
        licenseKey: form.licenseKey.trim(),
        companyName: effectiveCompanyName,
        adminName: form.adminName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        ...(usingGoogle
          ? { googleIdToken: googleIdToken! }
          : { password: form.password }),
      });
      toast.success(
        usingGoogle
          ? 'Company registered! Sign in with Google on the login page.'
          : 'Company registered! You can login now.',
      );
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
              <AuthPageBrand />
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Register Your Company
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Get started with your dedicated logistics dashboard.
              </p>

              {fromInvitation && (
                <div
                  className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
                  role="status"
                >
                  Invitation link detected — license key and email are pre-filled.
                  Click <strong>Verify</strong> if not already verified.
                </div>
              )}

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

              {usingGoogle && (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Signed in with Google as <strong>{form.email}</strong>. Password is not
                  required — verify your license and tap Register.
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="licenseKey"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    License Key
                    {requiredAsterisk}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="licenseKey"
                        required
                        value={form.licenseKey}
                        onChange={(e) => {
                          setForm({ ...form, licenseKey: e.target.value });
                          setLicenseVerified(false);
                          setLicensePreview(null);
                        }}
                        placeholder="FLT-XXXX-XXXX-XXXX"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyLicense}
                      disabled={verifying || !form.licenseKey.trim()}
                      className="shrink-0 rounded-lg border border-[#00AEEF] px-4 py-3 text-sm font-semibold text-[#00AEEF] transition hover:bg-sky-50 disabled:opacity-50"
                    >
                      {verifying ? 'Checking...' : licenseVerified ? 'Verified ✓' : 'Verify'}
                    </button>
                  </div>
                  {licensePreview?.valid && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <p className="font-semibold">
                        Plan: {licensePreview.planLabel ?? licensePreview.plan}
                      </p>
                      <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-emerald-800">
                        {licensePreview.maxAdmins != null && (
                          <li>Admins: {licensePreview.maxAdmins}</li>
                        )}
                        {licensePreview.maxOwners != null && (
                          <li>Owners: {licensePreview.maxOwners}</li>
                        )}
                        {licensePreview.maxDrivers != null && (
                          <li>Drivers: {licensePreview.maxDrivers}</li>
                        )}
                        {licensePreview.maxVehicles != null && (
                          <li>Vehicles: {licensePreview.maxVehicles}</li>
                        )}
                      </ul>
                      {licensePreview.validUntil && (
                        <p className="mt-1.5 text-xs text-emerald-700">
                          Valid until{' '}
                          {new Date(licensePreview.validUntil).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
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
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder={suggestedCompanyName || 'e.g. Global Logistics Inc.'}
                      className={inputClass}
                    />
                  </div>
                  {suggestedCompanyName && !form.companyName.trim() && (
                    <p className="mt-1 text-xs text-slate-500">
                      Auto-filled from license: <strong>{suggestedCompanyName}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="adminName"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Admin Full Name
                    {requiredAsterisk}
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
                    {requiredAsterisk}
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
                    {requiredAsterisk}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={(e) => {
                        if (!lockedEmail) setForm({ ...form, email: e.target.value });
                      }}
                      placeholder="admin@company.com"
                      className={inputClass}
                      readOnly={!!lockedEmail}
                    />
                  </div>
                  {lockedEmail && (
                    <p className="mt-1 text-xs text-slate-500">
                      Email is locked from license invitation.
                    </p>
                  )}
                </div>

                {!usingGoogle && (
                  <>
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Password
                    {requiredAsterisk}
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
                    {requiredAsterisk}
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
                  </>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#00AEEF] focus:ring-[#00AEEF]/30"
                  />
                  <span>
                    I agree to the{' '}
                    <Link
                      to={ROUTES.TERMS_OF_SERVICE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                      style={{ color: '#00AEEF' }}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      to={ROUTES.PRIVACY_POLICY}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                      style={{ color: '#00AEEF' }}
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || googleLoading || !licenseVerified || !acceptedLegal}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                  style={{ backgroundColor: '#00AEEF' }}
                >
                  {loading ? 'Registering...' : usingGoogle ? 'Register with Google' : 'Register'}
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

          <AuthPageFooter />
        </div>
      </div>
    </div>
  );
}
