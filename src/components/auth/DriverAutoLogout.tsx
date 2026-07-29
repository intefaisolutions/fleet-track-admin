import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  DRIVER_ACTIVITY_TOUCH_INTERVAL_MS,
  DRIVER_INACTIVITY_MS,
  DRIVER_SESSION_EXPIRED_MESSAGE,
} from '../../config/driverSession';
import { ROUTES, ROLES } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import {
  clearDriverLastActivity,
  readDriverLastActivity,
  writeDriverLastActivity,
} from '../../utils/driverSessionStorage';

/**
 * Drivers only: logout after 7 days of inactivity.
 * Active drivers keep lastActivity updated and stay signed in.
 * Other roles are unaffected.
 */
export function DriverAutoLogout() {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const loggingOutRef = useRef(false);
  const lastTouchRef = useRef(0);

  const isDriver = isAuthenticated && user?.role === ROLES.DRIVER;

  const forceLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      toast.info(DRIVER_SESSION_EXPIRED_MESSAGE, { autoClose: 6000 });
      await logout();
      clearDriverLastActivity();
      navigate(ROUTES.SIGN_IN, { replace: true });
    } finally {
      loggingOutRef.current = false;
    }
  }, [logout, navigate]);

  const touchActivity = useCallback(() => {
    if (!isDriver) return;
    const now = Date.now();
    if (now - lastTouchRef.current < DRIVER_ACTIVITY_TOUCH_INTERVAL_MS) {
      return;
    }
    lastTouchRef.current = now;
    writeDriverLastActivity(now);
  }, [isDriver]);

  useEffect(() => {
    if (loading || !isDriver) return;
    if (!readDriverLastActivity()) {
      writeDriverLastActivity();
    }
  }, [isDriver, loading, user?.id]);

  useEffect(() => {
    if (loading || !isDriver) return;

    const check = () => {
      const last = readDriverLastActivity();
      if (last != null && Date.now() - last > DRIVER_INACTIVITY_MS) {
        void forceLogout();
      }
    };

    check();
    const interval = window.setInterval(check, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isDriver, loading, forceLogout]);

  useEffect(() => {
    if (!isDriver) return;

    const onActivity = () => touchActivity();
    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
      'mousemove',
    ];

    events.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    );

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [isDriver, touchActivity]);

  return null;
}
