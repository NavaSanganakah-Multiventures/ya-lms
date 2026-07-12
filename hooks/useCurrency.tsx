'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'INR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (price: number) => string;
  getCoursePrice: (course: any) => string;
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
      return `$${price}`;
    }
    return `₹${price.toLocaleString('hi-IN')}`;
  };

  const getCoursePrice = (course: any) => {
    if (currency === 'USD') {
      return `$${course.price_usd || 0}`;
    }
    return `₹${(course.price_rupees || 0).toLocaleString('hi-IN')}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, formatPrice, getCoursePrice }}>
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
