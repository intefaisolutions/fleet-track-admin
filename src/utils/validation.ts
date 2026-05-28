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
  if (digits.length < 10 || digits.length > 15) {
    return 'Phone must be 10–15 digits';
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
