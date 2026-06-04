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
import type { AuthUser, LoginResponse } from '../types/api';
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
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_USER);
    if (stored) {
      try {
        setUser(mapAuthUser(JSON.parse(stored) as AuthUser & { _id?: string }));
      } catch {
        localStorage.clear();
        setLoading(false);
        return;
      }
    }

    authService
      .profile()
      .then((res) => {
        if (res.data) {
          const authUser = mapAuthUser(res.data as AuthUser & { _id?: string });
          localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(authUser));
          setUser(authUser);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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

  const completeLoginFromResponse = useCallback(
    (data: LoginResponse | undefined) => {
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
        licenseNotice: data.licenseNotice,
      };
    },
    [persistSession],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authService.login({
        email: normalizeEmail(payload.email),
        password: payload.password,
      });
      return completeLoginFromResponse(res.data);
    },
    [completeLoginFromResponse],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const res = await authService.loginWithGoogle(idToken);
      return completeLoginFromResponse(res.data);
    },
    [completeLoginFromResponse],
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
      loginWithGoogle,
      logout,
      setUser,
    }),
    [user, loading, login, loginWithGoogle, logout],
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
