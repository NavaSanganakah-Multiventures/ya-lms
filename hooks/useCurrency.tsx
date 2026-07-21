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
    const formatted = Number(price).toLocaleString('hi-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (currency === 'USD') {
      return `$${formatted}`;
    }
    return `₹${formatted}`;
  };

  const getCoursePrice = (course: any) => {
    const price = Number(course.price_rupees || 0);
    const formatted = price.toLocaleString('hi-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (currency === 'USD') {
      return `$${formatted}`;
    }
    return `₹${formatted}`;
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
