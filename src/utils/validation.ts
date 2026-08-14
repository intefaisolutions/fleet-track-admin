export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    return 'Enter a valid email address';
  }
  return null;
}

export function validatePhone(phone: string, required = true): string | null {
  if (!phone.trim()) {
    return required ? 'Phone number is required' : null;
  }
  const digits = normalizePhone(phone);
  if (digits.length !== 10) {
    return 'Phone must be exactly 10 digits';
  }
  return null;
}

/** Indian driving licence: state code (2 letters) + serial (alphanumeric). */
export function normalizeLicenseNumber(license: string): string {
  return license.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function validateDrivingLicense(
  license: string,
  required = true,
): string | null {
  if (!license.trim()) {
    return required ? 'License number is required' : null;
  }
  const normalized = normalizeLicenseNumber(license);
  if (!/^[A-Z]{2}[A-Z0-9]{6,14}$/.test(normalized)) {
    return 'Enter a valid license number (e.g. DL1420110012345)';
  }
  return null;
}

/** UPI transaction / reference IDs from PhonePe, GPay, etc. */
export function validateUpiTransactionId(txnId: string): string | null {
  const value = txnId.trim().toUpperCase();
  if (!value) return 'UPI Transaction ID is required';
  if (value.length < 8 || value.length > 40) {
    return 'UPI Transaction ID must be 8–40 characters';
  }
  if (!/^[A-Z0-9/_-]+$/.test(value)) {
    return 'UPI Transaction ID can only contain letters, numbers, -, _ and /';
  }
  return null;
}

/** Bank UTR / NEFT / IMPS reference */
export function validateBankUtr(utr: string): string | null {
  const value = utr.trim().toUpperCase().replace(/\s+/g, '');
  if (!value) return 'Bank UTR / reference number is required';
  if (value.length < 8 || value.length > 30) {
    return 'UTR / reference must be 8–30 characters';
  }
  // Common UTR: 12+ alphanumeric; allow slightly flexible refs
  if (!/^[A-Z0-9]+$/.test(value)) {
    return 'UTR / reference must be letters and numbers only';
  }
  return null;
}

export function validatePaymentPaidAt(paidAt: string): string | null {
  if (!paidAt.trim()) return 'Payment date & time is required';
  const d = new Date(paidAt);
  if (Number.isNaN(d.getTime())) return 'Enter a valid payment date & time';
  if (d.getTime() > Date.now() + 5 * 60 * 1000) {
    return 'Payment date cannot be in the future';
  }
  // Reject dates older than 60 days as likely typos
  if (d.getTime() < Date.now() - 60 * 24 * 60 * 60 * 1000) {
    return 'Payment date cannot be older than 60 days';
  }
  return null;
}

export function validateCompanyForm(form: {
  name: string;
  email: string;
  phone: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Company name must be at least 2 characters';
  }
  const emailErr = validateEmail(form.email);
  if (emailErr) errors.email = emailErr;
  const phoneErr = validatePhone(form.phone, true);
  if (phoneErr) errors.phone = phoneErr;
  return errors;
}

export function validateSuperAdminForm(form: {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  setupSecret: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.setupSecret.trim()) errors.setupSecret = 'Setup secret is required';
  if (!form.fullName.trim()) errors.fullName = 'Full name is required';
  const emailErr = validateEmail(form.email);
  if (emailErr) errors.email = emailErr;
  const phoneErr = validatePhone(form.phone, true);
  if (phoneErr) errors.phone = phoneErr;
  if (!form.password || form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  return errors;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response &&
    err.response.data &&
    typeof err.response.data === 'object'
  ) {
    const data = err.response.data as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (data.message) return String(data.message);
  }
  return fallback;
}
