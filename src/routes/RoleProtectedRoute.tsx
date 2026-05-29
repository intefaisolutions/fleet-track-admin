import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../config/constants';
import { useAuth } from '../context/AuthContext';

export function RoleProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-fleet-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.SIGN_IN} replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={ROUTES.SIGN_IN} replace />;
  }

  return <Outlet />;
}
