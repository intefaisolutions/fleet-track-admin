import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS, ROLES } from '../config/constants';
import type { LoginPayload } from '../services/auth.service';
import type { AuthUser } from '../types/api';
import { AuthContext } from './auth-context';

type StaticAccount = {
  password: string;
  user: AuthUser;
};

const STATIC_ACCOUNTS: Record<string, StaticAccount> = {
  'admin@fleettrack.com': {
    password: 'admin123',
    user: {
      id: 'static-super-admin-1',
      fullName: 'Fleet Super Admin',
      email: 'admin@fleettrack.com',
      phone: '+91 9999999999',
      role: ROLES.SUPER_ADMIN,
      status: 'ACTIVE',
      isEmailVerified: true,
      permissions: ['*'],
    },
  },
  'company@fleettrack.com': {
    password: 'company123',
    user: {
      id: 'static-company-admin-1',
      fullName: 'Company Admin',
      email: 'company@fleettrack.com',
      phone: '+91 8888888888',
      role: ROLES.COMPANY_ADMIN,
      status: 'ACTIVE',
      isEmailVerified: true,
      companyId: 'static-company-1',
    },
  },
  'owner@fleettrack.com': {
    password: 'owner123',
    user: {
      id: 'static-owner-1',
      fullName: 'Vehicle Owner',
      email: 'owner@fleettrack.com',
      phone: '+91 7777777777',
      role: ROLES.VEHICLE_OWNER,
      status: 'ACTIVE',
      isEmailVerified: true,
      companyId: 'static-company-1',
    },
  },
};

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
      const email = payload.email.trim().toLowerCase();
      const account = STATIC_ACCOUNTS[email];
      if (!account || account.password !== payload.password) {
        throw new Error('Invalid credentials');
      }

      const allowed = Object.values(ROLES) as string[];
      if (!allowed.includes(account.user.role)) {
        throw new Error('Your role is not supported in this portal yet');
      }

      const accessToken = `static-access-${Date.now()}`;
      const refreshToken = `static-refresh-${Date.now()}`;
      persistSession(
        accessToken,
        refreshToken,
        account.user,
      );
      return {
        role: account.user.role,
        permissions: account.user.permissions ?? [],
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
