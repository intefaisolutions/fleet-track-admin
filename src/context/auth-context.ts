import { createContext } from 'react';
import type { LoginPayload } from '../services/auth.service';
import type { AuthUser } from '../types/api';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
