import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { ROUTES } from '../../config/constants';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link to={ROUTES.SIGN_IN} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#00AEEF]">
          <Truck className="h-4 w-4" /> Back to Sign In
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Fleet Track Services — Last updated 2026</p>
        <div className="prose prose-slate mt-6 max-w-none text-sm text-slate-700">
          <p>
            Fleet Track Services (&quot;we&quot;, &quot;our&quot;) respects your privacy. This policy
            describes how we collect, use, and protect personal and fleet data when you use our
            web portal and mobile applications.
          </p>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Data we collect</h2>
          <ul className="list-disc pl-5">
            <li>Account information (name, email, phone, role)</li>
            <li>Fleet data (vehicles, drivers, expenses, reports)</li>
            <li>Authentication logs and session tokens</li>
          </ul>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">How we use data</h2>
          <p>
            Data is used to operate fleet tracking, expense management, subscriptions, and
            support. We do not sell personal data to third parties.
          </p>
          <h2 className="mt-6 text-lg font-semibold text-slate-900">Contact</h2>
          <p>
            For privacy requests, contact your company administrator or Fleet Track Services
            support.
          </p>
        </div>
      </div>
    </div>
  );
}
