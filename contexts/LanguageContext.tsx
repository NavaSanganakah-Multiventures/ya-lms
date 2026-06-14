'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../translations/en.json';
import hi from '../translations/hi.json';

type Language = 'en' | 'hi';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionaries: Record<Language, any> = { en, hi };

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'hi')) {
      queueMicrotask(() => {
        setLanguageState(savedLang);
      });
    }
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (path: string, params?: Record<string, any>): string => {
    const keys = path.split('.');
    let value = dictionaries[language];

    for (const key of keys) {
      if (value && value[key]) {
        value = value[key];
      } else {
        return path; // Fallback to key name
      }
    }

    let result = typeof value === 'string' ? value : path;

    // Handle interpolation and pluralization
    if (params) {
      // Replace placeholders like {count}, {cost}, etc.
      result = result.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] !== undefined ? String(params[key]) : match;
      });

      // Handle pluralization if count param exists
      if (params.count !== undefined) {
        const count = Number(params.count);
        // Simple pluralization: assumes translation has plural forms separated by |
        const parts = result.split('|');
        if (parts.length > 1) {
          result = count === 1 ? parts[0] : parts[1];
        }
      }
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {mounted ? children : <div className="hidden">{children}</div>}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
