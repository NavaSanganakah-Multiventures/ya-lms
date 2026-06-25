'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 hover:bg-neutral-800 border border-white/5 rounded-xl transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        aria-label="Toggle language"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Toggle language"
      >
        <Globe className="w-4 h-4 text-orange-400 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          {language === 'en' ? 'EN' : 'HI'}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-32 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
          role="menu"
        >
          <button
            role="menuitem"
            onClick={() => { setLanguage('en'); setIsOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:bg-white/10 ${language === 'en' ? 'bg-orange-600 text-white focus-visible:bg-orange-500' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
          >
            <span>{t('common.english')}</span>
            {language === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />}
          </button>
          <button
            role="menuitem"
            onClick={() => { setLanguage('hi'); setIsOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:bg-white/10 ${language === 'hi' ? 'bg-orange-600 text-white focus-visible:bg-orange-500' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
          >
            <span>{t('common.hindi')}</span>
            {language === 'hi' && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#fff]" />}
          </button>
        </div>
      )}
    </div>
  );
}
