'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { api, clearTokens, getAccessToken, storeTokens } from './api';
import type { AuthTokens, PublicUser } from './types';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  user: PublicUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  setSession: (tokens: AuthTokens) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!getAccessToken()) {
        setStatus('guest');
        return;
      }
      try {
        const me = await api.get<PublicUser>('/auth/me');
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        clearTokens();
        if (!cancelled) {
          setUser(null);
          setStatus('guest');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback((tokens: AuthTokens) => {
    storeTokens(tokens.accessToken, tokens.refreshToken);
    setUser(tokens.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.post<AuthTokens>('/auth/login', {
        email,
        password,
      });
      setSession(tokens);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = window.localStorage.getItem('ca_firm_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout errors; still clear local state.
    }
    clearTokens();
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, setSession, logout }),
    [user, status, login, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
