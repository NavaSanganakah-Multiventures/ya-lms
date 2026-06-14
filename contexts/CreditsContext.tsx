'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface CreditsContextType {
  credits: number;
  loading: boolean;
  error: string | null;
  setCredits: (credits: number) => void;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  loading: true,
  error: null,
  setCredits: () => {},
  refreshCredits: async () => {},
});

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCreditsState] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setCredits = useCallback((newCredits: number) => {
    setCreditsState(newCredits);
  }, []);

  const refreshCredits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credits/balance');
      if (!res.ok) {
        setError('Failed to load credits');
        return;
      }
      const data: any = await res.json();
      if (data && typeof data.balance === 'number') {
        setCreditsState(data.balance);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to refresh credits:', err);
      setError('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <CreditsContext.Provider value={{ credits, loading, error, setCredits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
