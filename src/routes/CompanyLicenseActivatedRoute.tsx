import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { companiesService } from '../services/companies.service';

/**
 * Navigation gate: Company Admin dashboard/routes stay blocked until
 * license verification succeeds. Auth tokens are unchanged.
 */
export function CompanyLicenseActivatedRoute() {
  const { user, markLicenseActivated } = useAuth();
  const [checking, setChecking] = useState(true);
  const [requiresActivation, setRequiresActivation] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);

    companiesService
      .getLicenseActivationStatus()
      .then((res) => {
        if (cancelled) return;
        const needs = !!res.data?.requiresActivation;
        setRequiresActivation(needs);
        if (!needs) {
          markLicenseActivated();
        }
      })
      .catch(() => {
        // Fail closed: keep non-verified users on License Verification
        if (!cancelled) {
          setRequiresActivation(user?.requiresLicenseActivation !== false);
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.requiresLicenseActivation, markLicenseActivated]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-fleet-500 border-t-transparent" />
      </div>
    );
  }

  if (requiresActivation) {
    return <Navigate to={ROUTES.COMPANY_LICENSE_ACTIVATION} replace />;
  }

  return <Outlet />;
}
