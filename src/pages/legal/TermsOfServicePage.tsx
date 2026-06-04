import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { ROUTES } from '../../config/constants';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link to={ROUTES.SIGN_IN} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#00AEEF]">
          <Truck className="h-4 w-4" /> Back to Sign In
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Fleet Track Services — Last updated 2026</p>
        <div className="prose prose-slate mt-6 max-w-none text-sm text-slate-700">
          <p>
            By using Fleet Track Services you agree to these terms. If you do not agree, do not
            use the platform.
          </p>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Accounts</h2>
          <p>
            Users must be invited or registered by an authorized company admin. You are
            responsible for keeping login credentials secure.
          </p>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Acceptable use</h2>
          <ul className="list-disc pl-5">
            <li>Use the service only for lawful fleet and expense management</li>
            <li>Do not attempt unauthorized access to other companies&apos; data</li>
            <li>Do not misuse APIs or automated scraping without permission</li>
          </ul>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Subscriptions</h2>
          <p>
            Vehicle limits and plans are enforced per company license. Payment verification is
            subject to company admin approval where applicable.
          </p>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Liability</h2>
          <p>
            The service is provided as-is. Fleet Track Services is not liable for indirect
            losses arising from downtime or data entry errors by users.
          </p>
        </div>
      </div>
    </div>
  );
}
