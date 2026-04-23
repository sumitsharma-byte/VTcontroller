'use client';

import React, {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode
} from 'react';
import { authApi, getUser, setUser, getToken, setToken, removeToken, type AuthUser } from './api';

// ─────────────────────────────────────────────────────────────
// Context types
// ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, token: null, loading: true,
  login: async () => {}, logout: async () => {},
  isAuthenticated: false,
});

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = getToken();
    const storedUser  = getUser();
    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUserState(storedUser);
      // Silently refresh user data
      authApi.me()
        .then(({ user }) => { setUserState(user); setUser(user); })
        .catch(() => { removeToken(); setUserState(null); setTokenState(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    setUser(res.user);
    setTokenState(res.token);
    setUserState(res.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (_) {}
    removeToken();
    setUserState(null);
    setTokenState(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout,
      isAuthenticated: !!user && !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Custom hook
// ─────────────────────────────────────────────────────────────
export function useAuth() {
  return useContext(AuthContext);
}
