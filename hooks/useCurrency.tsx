'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'INR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (price: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('INR');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_currency') as Currency;
      if (saved && (saved === 'INR' || saved === 'USD')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrency(saved);
      }
    }
  }, []);

  const handleSetCurrency = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem('app_currency', c);
  };

  const formatPrice = (price: number) => {
    if (currency === 'USD') {
      // Hardcoded conversion rate for demo
      const usdPrice = (price / 83).toFixed(2);
      return `$${usdPrice}`;
    }
    return `₹${price.toLocaleString('hi-IN')}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
