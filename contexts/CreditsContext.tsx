'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Balances {
  balance: number;
  ai_balance: number;
  live_class_balance: number;
  self_study_balance: number;
  lifetime_credits: number;
  lifetime_ai_credits: number;
  lifetime_live_class_credits: number;
  lifetime_self_study_credits: number;
}

interface CreditsContextType {
  credits: number;
  balances: Balances | null;
  setCredits: (credits: number | Balances) => void;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  balances: null,
  setCredits: () => {},
  refreshCredits: async () => {},
});

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCreditsState] = useState<number>(0);
  const [balances, setBalancesState] = useState<Balances | null>(null);

  const setCredits = useCallback((newCredits: number | Balances) => {
    if (typeof newCredits === 'number') {
      setCreditsState(newCredits);
    } else if (newCredits && typeof newCredits === 'object') {
      setBalancesState(newCredits);
      setCreditsState(newCredits.ai_balance ?? newCredits.balance ?? 0);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/balance');
      if (!res.ok) return;
      const data: any = await res.json();
      if (data && 'balance' in data) {
        setBalancesState(data);
        setCreditsState(data.ai_balance ?? data.balance ?? 0);
      }
    } catch (err) {
      console.error('Failed to refresh credits:', err);
    }
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, balances, setCredits, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
