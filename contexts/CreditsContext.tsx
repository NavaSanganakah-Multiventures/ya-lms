'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';

export interface WalletData {
  balance_rupees: number;
  lifetime_deposits_rupees: number;
  lifetime_withdrawals_rupees: number;
}

interface WalletContextType {
  balance_rupees: number;
  walletData: WalletData | null;
  setBalance: (balance: number | WalletData) => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  balance_rupees: 0,
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
      setBalanceState(newBalance.balance_rupees ?? 0);
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet/balance?t=${Date.now()}`);
      if (!res.ok) {
        console.warn(`[Wallet] refreshBalance returned ${res.status}: ${res.statusText}`);
        // Preserve existing balance on transient failures to avoid a confusing "0" flash.
        return;
      }
      const data: any = await res.json();
      if (data && typeof data === 'object' && 'balance_rupees' in data) {
        setWalletData(data);
        setBalanceState(data.balance_rupees ?? 0);
      } else {
        console.warn('[Wallet] Unexpected API response format:', data);
      }
    } catch (err) {
      console.error('[Wallet] Failed to refresh wallet:', err);
      // Keep stale balance on network error; do not reset to zero.
    }
  }, []);

  // Listen for real-time wallet updates broadcast from DataSyncDO.
  // Normalized event shape: { channel: 'user:me', entity: 'wallet', action, data }
  useRealtimeChannel('user:me', (event) => {
    if (event.channel === 'user:me' && (event.entity === 'wallet' || event.type === 'wallet')) {
      refreshBalance();
    }
  });

  return (
    <WalletContext.Provider value={{ balance_rupees: balanceInr, walletData, setBalance, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
