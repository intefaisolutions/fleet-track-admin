import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../config/constants';
import { showDriverApkRequiredDialog } from '../../utils/driverWebAccess';

/**
 * Drivers must use the FleetTrack APK. If they hit this route (bookmark / deep link),
 * show the APK message, log them out, and send them back to Sign In.
 */
export function DriverDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      await logout();
      await showDriverApkRequiredDialog();
      navigate(ROUTES.SIGN_IN, { replace: true });
    })();
  }, [logout, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <p className="text-sm text-slate-500">
        Drivers must use the FleetTrack Driver APK…
      </p>
    </div>
  );
}
