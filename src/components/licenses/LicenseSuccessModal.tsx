import { Copy, Mail, X } from 'lucide-react';
import { toast } from 'react-toastify';

export interface GeneratedLicense {
  _id: string;
  licenseKey: string;
  intendedCompanyName?: string;
  contactEmail?: string;
  planType: string;
  validUntil?: string;
  emailed?: boolean;
}

export function LicenseSuccessModal({
  license,
  onClose,
  onSendEmail,
  sendingEmail,
}: {
  license: GeneratedLicense;
  onClose: () => void;
  onSendEmail: () => void;
  sendingEmail: boolean;
}) {
  const copyKey = () => {
    navigator.clipboard.writeText(license.licenseKey);
    toast.success('License key copied');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900">License Generated Successfully</h2>
          <p className="mt-1 text-sm text-slate-500">
            Share this key with{' '}
            {license.intendedCompanyName ?? license.contactEmail ?? 'your client'}.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-sky-50 px-4 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            License Key
          </p>
          <p className="mt-2 font-mono text-lg font-bold tracking-wider text-sky-700">
            {license.licenseKey}
          </p>
        </div>

        {license.emailed && (
          <p className="mt-3 text-center text-xs text-emerald-600">
            Email sent to {license.contactEmail}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={copyKey}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          {license.contactEmail && (
            <button
              type="button"
              onClick={onSendEmail}
              disabled={sendingEmail}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {sendingEmail ? 'Sending...' : license.emailed ? 'Resend Email' : 'Send Email'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}
