import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  apiLogin,
  apiMe,
  apiRegister,
  apiSignOut,
  type AuthUser,
} from './auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, displayName?: string, inviteCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshUser = useCallback(async () => {
    const me = await apiMe();
    setUser(me);
  }, []);

  useEffect(() => {
    apiMe()
      .then(setUser)
      .finally(() => setIsLoaded(true));
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = true) => {
    const u = await apiLogin(email, password, rememberMe);
    setUser(u);
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    displayName?: string,
    inviteCode?: string,
  ) => {
    const u = await apiRegister(email, password, displayName, inviteCode);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn: !!user,
        login,
        register,
        signOut,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
