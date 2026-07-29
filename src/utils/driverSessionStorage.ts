import { STORAGE_KEYS } from '../config/constants';

export function readDriverLastActivity(): number | null {
  const raw = localStorage.getItem(STORAGE_KEYS.DRIVER_LAST_ACTIVITY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function writeDriverLastActivity(ts = Date.now()) {
  localStorage.setItem(STORAGE_KEYS.DRIVER_LAST_ACTIVITY, String(ts));
}

export function clearDriverLastActivity() {
  localStorage.removeItem(STORAGE_KEYS.DRIVER_LAST_ACTIVITY);
}
