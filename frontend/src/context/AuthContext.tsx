import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthSession } from '../types/AuthSession';
import { getAuthSession } from '../lib/authAPI';

const ANON: AuthSession = { isAuthenticated: false, userName: null, email: null, roles: [] };

interface AuthContextValue {
  authSession: AuthSession;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuthSession: () => Promise<AuthSession>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authSession, setAuthSession] = useState<AuthSession>(ANON);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthSession = async () => {
    try {
      const session = await getAuthSession();
      setAuthSession(session);
      return session;
    } catch {
      setAuthSession(ANON);
      return ANON;
    }
  };

  useEffect(() => {
    refreshAuthSession().finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ authSession, isAuthenticated: authSession.isAuthenticated, isLoading, refreshAuthSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
