'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { useCurrency } from '@/hooks/useCurrency';
import { useSessionGuard, SessionWarningModal, SessionExpiredModal } from '@/hooks/useSessionGuard';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Menu, X, BookOpen, User, LogOut, LayoutDashboard, Settings, Crown, Sparkles, Plus, Wallet, FileQuestion } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BuyCreditsModal from '@/components/BuyCreditsModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBuyCreditsOpen, setIsBuyCreditsOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const { currency, setCurrency } = useCurrency();
  const { t, language } = useLanguage();
  const router = useRouter();

  // Session guard — student: 12h session, 1h inactivity logout
  const { showWarning, logoutReason, extendSession } = useSessionGuard('/auth/login');

  const [siteSettings, setSiteSettings] = useState<any>({});
  useEffect(() => {
    // ⚡ Bolt: Fetch settings and credits concurrently to prevent waterfall
    Promise.all([
      fetch('/api/settings')
        .then(res => res.json())
        .then((data: any) => setSiteSettings(data.settings || {}))
        .catch(err => console.error('Failed to load settings:', err)),
      fetch('/api/credits/balance')
        .then(res => res.json())
        .then((data: any) => {
          if (data) {
            setCredits(data.balance || 0);
          }
        })
        .catch(err => console.error('Failed to load credits:', err))
    ]);
  }, []);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
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
      <BuyCreditsModal 
        isOpen={isBuyCreditsOpen} 
        onClose={() => setIsBuyCreditsOpen(false)} 
        onSuccess={(newCredits) => setCredits(newCredits)}
      />
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

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <nav className="flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> {t('common.dashboard')}
                </Link>
                <Link href="/dashboard/my-courses" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> {t('dashboard.enrolled_courses')}
                </Link>
                <Link href="/dashboard/profile" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <User className="w-4 h-4" /> {t('common.profile')}
                </Link>
                <Link href="/dashboard/exams" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <FileQuestion className="w-4 h-4" /> Exams
                </Link>
                <Link href="/dashboard/settings" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <Settings className="w-4 h-4" /> {t('common.settings')}
                </Link>
                <Link href="/dashboard/subscription" className="text-sm font-medium text-violet-400 hover:text-violet-200 transition-all flex items-center gap-2">
                  <Crown className="w-4 h-4" /> {t('dashboard.explore_courses')}
                </Link>

                <div className="flex items-center gap-2 ml-2">
                  <LanguageSwitcher />
                  <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700">
                     <button 
                      onClick={() => setCurrency('INR')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${currency === 'INR' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                     >
                       ₹ INR
                     </button>
                     <button 
                      onClick={() => setCurrency('USD')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${currency === 'USD' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                     >
                       $ USD
                     </button>
                  </div>
                </div>
              </nav>
              <div className="w-px h-6 bg-neutral-800" />
              <div className="flex items-center gap-5">
                {/* Credits */}
                <div className="flex items-center gap-1 bg-neutral-800/80 border border-neutral-700/50 rounded-xl p-1">
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-black text-white">{credits}</span>
                  </div>
                  <button 
                    onClick={() => setIsBuyCreditsOpen(true)}
                    className="p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                    title="Buy Credits"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <NotificationBell />
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-bold text-neutral-300 hover:text-white rounded-xl transition-all border border-neutral-700"
                >
                  {t('common.logout')}
                </button>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setIsBuyCreditsOpen(true)}
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
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="sr-only">Menu</span>
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
              <div className="px-4 py-6 space-y-2">

                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-orange-500/20 p-2 text-orange-200">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">Credits Wallet</p>
                        <p className="text-xs text-orange-100/70">{credits} credits available</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setIsBuyCreditsOpen(true); setIsMobileMenuOpen(false); }}
                      className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white shadow-lg shadow-orange-950/30"
                    >
                      Buy
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-500">Preferences</span>
                    <LanguageSwitcher />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrency('INR')}
                      className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${currency === 'INR' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-neutral-900 text-neutral-400'}`}
                    >
                      ₹ INR
                    </button>
                    <button
                      onClick={() => setCurrency('USD')}
                      className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${currency === 'USD' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-neutral-900 text-neutral-400'}`}
                    >
                      $ USD
                    </button>
                  </div>
                </div>
                <Link 
                  href="/dashboard" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-orange-600/20 transition-colors">
                    <LayoutDashboard className="w-5 h-5 group-hover:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold">सभी पाठ्यक्रम</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Browse All</p>
                  </div>
                </Link>

                <Link 
                  href="/dashboard/my-courses" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-orange-600/20 transition-colors">
                    <BookOpen className="w-5 h-5 group-hover:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold">मेरे पाठ्यक्रम</p>
                    <p className="text-[10px] text-neutral-500 uppercase">My Learning</p>
                  </div>
                </Link>
                
                <Link
                  href="/dashboard/exams"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-orange-600/20 transition-colors">
                    <FileQuestion className="w-5 h-5 group-hover:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold">Exams / Quizzes</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Assessments</p>
                  </div>
                </Link>

                <Link 
                  href="/dashboard/profile" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-orange-600/20 transition-colors">
                    <User className="w-5 h-5 group-hover:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold">प्रोफ़ाइल</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Profile</p>
                  </div>
                </Link>

                <Link 
                  href="/dashboard/settings" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-orange-600/20 transition-colors">
                    <Settings className="w-5 h-5 group-hover:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold">सेटिंग्स</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Preferences</p>
                  </div>
                </Link>

                <Link 
                  href="/dashboard/subscription" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-violet-300 hover:text-violet-100 hover:bg-violet-500/10 transition-all border border-transparent hover:border-violet-500/30 group"
                >
                  <div className="p-2 bg-violet-500/10 rounded-lg group-hover:bg-violet-600/20 transition-colors">
                    <Crown className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-bold">सब्सक्रिप्शन</p>
                    <p className="text-[10px] text-violet-500/60 uppercase">All Courses Access</p>
                  </div>
                </Link>

                <div className="pt-4 mt-4 border-t border-neutral-800">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-medium border border-transparent hover:border-red-500/20 text-left"
                  >
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">लॉग आउट</p>
                      <p className="text-[10px] text-red-500/50 uppercase">Logout</p>
                    </div>
                  </button>
                </div>
              </div>
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
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">प्रोफ़ाइल</span>
        </Link>
        <button 
          onClick={toggleMenu}
          className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center -mt-8 shadow-xl shadow-orange-500/30 border-4 border-neutral-950 text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <button
          onClick={() => setIsBuyCreditsOpen(true)}
          className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors"
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">वॉलेट</span>
        </button>
        <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-orange-400 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">सेटिंग्स</span>
        </Link>
      </div>

      {/* Mobile Sticky CTA Overlay logic if needed */}
    </div>
    </React.Fragment>
  );
}
