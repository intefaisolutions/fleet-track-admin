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
import { AuthContext } from './auth-context';

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
      const res = await authService.login(payload);
      if (!res.data) throw new Error(res.message || 'Login failed');

      const allowed = Object.values(ROLES) as string[];
      if (!allowed.includes(res.data.user.role)) {
        throw new Error('Your role is not supported in this portal yet');
      }

      persistSession(
        res.data.accessToken,
        res.data.refreshToken,
        res.data.user,
      );
      return {
        role: res.data.user.role,
        permissions: res.data.user.permissions ?? [],
      };
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
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
