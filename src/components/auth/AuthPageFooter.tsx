import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL?.trim() ?? '';

/** Shared footer for sign-in, register, forgot-password */
export function AuthPageFooter() {
  return (
    <footer className="flex flex-col gap-3 border-t border-slate-100 px-8 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-14 lg:px-20">
      <p>© 2026 Fleet Track Services. All rights reserved.</p>
      <div className="flex flex-wrap gap-4">
        <Link to={ROUTES.PRIVACY_POLICY} className="hover:text-slate-600">
          Privacy Policy
        </Link>
        <Link to={ROUTES.TERMS_OF_SERVICE} className="hover:text-slate-600">
          Terms of Service
        </Link>
        {SUPPORT_EMAIL ? (
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-slate-600">
            Contact Support
          </a>
        ) : null}
      </div>
    </footer>
  );
}
