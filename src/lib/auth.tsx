import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokens, type User } from './api';

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (role: 'admin' | 'editor') => boolean;
  /** Re-reads the signed-in user, after tokens are set outside signIn. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!tokens.access) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        tokens.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // The api layer emits this when a refresh fails, so an expired session
    // clears the UI instead of leaving a signed-in shell with no data.
    const onSignedOut = () => setUser(null);
    window.addEventListener('ri:signed-out', onSignedOut);

    return () => {
      cancelled = true;
      window.removeEventListener('ri:signed-out', onSignedOut);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const result = await api.login(email, password);
        tokens.set(result.accessToken, result.refreshToken);
        setUser(result.user);
      },
      async signOut() {
        try {
          await api.logout();
        } catch {
          // Signing out locally must succeed even if the server call does not.
        }
        tokens.clear();
        setUser(null);
      },
      async refresh() {
        try {
          const { user: me } = await api.me();
          setUser(me);
        } catch {
          tokens.clear();
          setUser(null);
        }
      },
      can(role) {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return role === 'editor' && user.role === 'editor';
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
