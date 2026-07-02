'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { useCurrency } from '@/hooks/useCurrency';
import { useSessionGuard, SessionWarningModal, SessionExpiredModal } from '@/hooks/useSessionGuard';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Menu, X, BookOpen, User, LogOut, LayoutDashboard, Settings, Crown, Sparkles, Plus, Wallet, FileQuestion, Video, Target, Trophy, CalendarDays, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditsProvider, useCredits } from '@/contexts/CreditsContext';
import { DesktopNav } from '@/components/DashboardNav/DesktopNav';
import { MobileMenu } from '@/components/DashboardNav/MobileMenu';
import DeletionBanner from '@/components/DeletionBanner';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { credits, refreshCredits } = useCredits();
  const { currency, setCurrency } = useCurrency();
  const { t, language } = useLanguage();
  const router = useRouter();

  // Session guard — student: 12h session, 1h inactivity logout
  const { showWarning, logoutReason, extendSession } = useSessionGuard('/auth/login');

  const [siteSettings, setSiteSettings] = useState<any>({});
  useEffect(() => {
    const loadLayoutData = async () => {
      await Promise.all([
        fetch('/api/settings')
          .then(res => res.json())
          .then((data: any) => setSiteSettings(data.settings || {}))
          .catch(err => console.error('Failed to load settings:', err)),
        refreshCredits(),
      ]);
    };
    loadLayoutData();
  }, [refreshCredits]);

  // Generate and persist a unique device ID for push notification device linking
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('lms_device_id')) {
      try {
        localStorage.setItem('lms_device_id', crypto.randomUUID());
      } catch {
        localStorage.setItem('lms_device_id', `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      }
    }
  }, []);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    try {
      const deviceId = typeof window !== 'undefined' ? localStorage.getItem('lms_device_id') : null;
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: deviceId ? { 'Content-Type': 'application/json' } : undefined,
        body: deviceId ? JSON.stringify({ device_id: deviceId }) : undefined
      });
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/auth/login';
    }
  };

  return (
    <React.Fragment>
      {/* Modals */}
      <SessionWarningModal
        show={showWarning}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
      <SessionExpiredModal reason={logoutReason} />

      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30">
      <nav className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-3">
            {/* Logo */}
            <Link href="/dashboard" className="min-w-0 flex items-center gap-2 sm:gap-3 group">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="max-w-[9rem] truncate font-bold text-base leading-tight text-white sm:max-w-none sm:text-lg sm:whitespace-nowrap">{siteSettings.site_name || 'Adityanveshan'}</span>
                <span className="hidden text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-medium sm:block">{siteSettings.dashboard_name || 'Swadhyaya Vedika'}</span>
              </div>
            </Link>

            {/* Desktop Navigation - Using New Component */}
            <DesktopNav 
              onBuyCredits={() => router.push('/dashboard/wallet')}
              credits={credits}
              currency={currency}
              onCurrencyChange={(curr) => setCurrency(curr as 'INR' | 'USD')}
              t={t}
            />

            {/* Actions Bar */}
            <div className="hidden md:flex items-center gap-5 ml-4">
              <LanguageSwitcher />
              <NotificationBell />
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-bold text-neutral-300 hover:text-white rounded-xl transition-all border border-neutral-700"
              >
                {t('common.logout')}
              </button>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => router.push('/dashboard/wallet')}
                className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-2.5 py-2 text-orange-100 shadow-lg shadow-orange-950/20 active:scale-95"
                aria-label="Credits wallet"
                title="Credits Wallet"
              >
                <Sparkles className="h-4 w-4 text-orange-300" />
                <span className="text-xs font-black">{credits}</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
              <NotificationBell />
              <button 
                onClick={toggleMenu}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all active:scale-95"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                title={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="sr-only">{isMobileMenuOpen ? "Close menu" : "Open menu"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden"
            >
              <MobileMenu
                onBuyCredits={() => router.push('/dashboard/wallet')}
                credits={credits}
                onLogout={handleLogout}
                onClose={() => setIsMobileMenuOpen(false)}
                currency={currency}
                onCurrencyChange={(curr) => setCurrency(curr as 'INR' | 'USD')}
                t={t}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-xl border-t border-neutral-800 px-6 py-3 flex items-center justify-between z-40 pb-safe">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">होम</span>
        </Link>
        <Link href="/dashboard/my-courses" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors">
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">कोर्स</span>
        </Link>
        <button 
          onClick={toggleMenu}
          className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center -mt-8 shadow-xl shadow-orange-500/30 border-4 border-neutral-950 text-white"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          title={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link
          href="/dashboard/wallet"
          className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">वॉलेट</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">प्रोफ़ाइल</span>
        </Link>
      </div>

      {/* Mobile Sticky CTA Overlay logic if needed */}
    </div>
    </React.Fragment>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreditsProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </CreditsProvider>
  );
}
