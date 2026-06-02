import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS, ROLES } from '../config/constants';
import { authService, type LoginPayload } from '../services/auth.service';
import type { AuthUser } from '../types/api';
import { normalizeEmail } from '../utils/validation';
import { AuthContext } from './auth-context';

function mapAuthUser(raw: AuthUser & { _id?: string }): AuthUser {
  const id = raw.id ?? raw._id ?? '';
  return {
    id: String(id),
    fullName: raw.fullName,
    email: raw.email,
    phone: raw.phone,
    role: raw.role,
    status: raw.status,
    profileImage: raw.profileImage ?? null,
    isEmailVerified: raw.isEmailVerified,
    companyId: raw.companyId ? String(raw.companyId) : undefined,
    permissions: raw.permissions ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_USER);
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored) as AuthUser);
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const persistSession = useCallback(
    (accessToken: string, refreshToken: string, authUser: AuthUser) => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(authUser));
      localStorage.setItem(STORAGE_KEYS.ROLE, authUser.role);
      setUser(authUser);
    },
    [],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authService.login({
        email: normalizeEmail(payload.email),
        password: payload.password,
      });

      const data = res.data;
      if (!data?.accessToken || !data?.refreshToken || !data.user) {
        throw new Error('Login failed');
      }

      const authUser = mapAuthUser(data.user as AuthUser & { _id?: string });
      const allowed = Object.values(ROLES) as string[];
      if (!allowed.includes(authUser.role)) {
        throw new Error('Your role is not supported in this portal yet');
      }

      persistSession(data.accessToken, data.refreshToken, authUser);
      return {
        role: authUser.role,
        permissions: authUser.permissions ?? [],
      };
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    localStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      role: user?.role ?? null,
      loading,
      login,
      logout,
      setUser,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
