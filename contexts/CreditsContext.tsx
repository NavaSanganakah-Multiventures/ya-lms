'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface WalletData {
  balance_inr: number;
  lifetime_deposits_inr: number;
  lifetime_withdrawals_inr: number;
}

interface WalletContextType {
  balance_inr: number;
  walletData: WalletData | null;
  setBalance: (balance: number | WalletData) => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  balance_inr: 0,
  walletData: null,
  setBalance: () => {},
  refreshBalance: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balanceInr, setBalanceState] = useState<number>(0);
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  const setBalance = useCallback((newBalance: number | WalletData) => {
    if (typeof newBalance === 'number') {
      setBalanceState(newBalance);
    } else if (newBalance && typeof newBalance === 'object') {
      setWalletData(newBalance);
      setBalanceState(newBalance.balance_inr ?? 0);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet/balance');
      if (!res.ok) return;
      const data: any = await res.json();
      if (data && 'balance_inr' in data) {
        setWalletData(data);
        setBalanceState(data.balance_inr ?? 0);
      }
    } catch (err) {
      console.error('Failed to refresh wallet:', err);
    }
  }, []);

  return (
    <WalletContext.Provider value={{ balance_inr: balanceInr, walletData, setBalance, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
