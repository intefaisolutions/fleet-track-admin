/** Driver auto-logout after this many days of inactivity */
export const DRIVER_INACTIVITY_DAYS = 7;

export const DRIVER_INACTIVITY_MS =
  DRIVER_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

/** Throttle client-side activity writes */
export const DRIVER_ACTIVITY_TOUCH_INTERVAL_MS = 60 * 1000; // 1 minute

export const DRIVER_SESSION_EXPIRED_MESSAGE =
  'Session expired due to 7 days of inactivity. Please login again.';
