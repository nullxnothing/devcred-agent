'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from 'react';

interface WalletAuthUser {
  id: string;
  walletAddress: string | null;
  twitterHandle: string | null;
  twitterName: string | null;
  avatarUrl: string | null;
  totalScore: number;
  tier: string | null;
  rank: number | null;
  isVerified: boolean;
}

interface WalletAuthContextValue {
  user: WalletAuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const WalletAuthContext = createContext<WalletAuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function useWalletAuth() {
  return useContext(WalletAuthContext);
}

function WalletAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WalletAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  return (
    <WalletAuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </WalletAuthContext.Provider>
  );
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <WalletAuthProvider>
        {children}
      </WalletAuthProvider>
    </SessionProvider>
  );
}
