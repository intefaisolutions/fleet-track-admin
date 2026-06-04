import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ROUTES,
  ROLES,
  firstSupportAdminRoute,
  supportAdminCanAccessRoute,
} from '../config/constants';

export function ProtectedRoute() {
  const { isAuthenticated, role, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-fleet-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.SIGN_IN} replace />;
  }

  const isAdminPortalRole = role === ROLES.SUPER_ADMIN || role === ROLES.SUPPORT_ADMIN;
  if (!isAdminPortalRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-xl font-bold text-slate-900">Access Denied</h1>
        <p className="text-slate-600">Only Super Admin or Support Admin can access this portal.</p>
      </div>
    );
  }

  if (role === ROLES.SUPPORT_ADMIN) {
    const perms = user?.permissions ?? [];
    if (!supportAdminCanAccessRoute(perms, location.pathname)) {
      const next = firstSupportAdminRoute(perms);
      return <Navigate to={next} replace />;
    }
  }

  return <Outlet />;
}
