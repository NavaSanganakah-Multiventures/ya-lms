'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CreditsContextType {
  credits: number;
  setCredits: (credits: number) => void;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  setCredits: () => {},
  refreshCredits: async () => {},
});

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCreditsState] = useState<number>(0);

  const setCredits = useCallback((newCredits: number) => {
    setCreditsState(newCredits);
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/balance');
      const data: any = await res.json();
      if (data) setCreditsState(data.balance || 0);
    } catch (err) {
      console.error('Failed to refresh credits:', err);
    }
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, setCredits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
