'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { useCurrency } from '@/hooks/useCurrency';
import { Menu, X, BookOpen, User, LogOut, LayoutDashboard, Settings, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback redirect
      window.location.href = '/auth/login';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight text-white whitespace-nowrap">Yagya Ashram</span>
                <span className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-medium">छात्र पोर्टल</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <nav className="flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> पाठ्यक्रम
                </Link>
                <Link href="/dashboard/my-courses" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> मेरे पाठ्यक्रम
                </Link>
                <Link href="/dashboard/profile" className="text-sm font-medium text-neutral-400 hover:text-white transition-all flex items-center gap-2">
                  <User className="w-4 h-4" /> प्रोफ़ाइल
                </Link>

                <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700 ml-2">
                   <button 
                    onClick={() => setCurrency('INR')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${currency === 'INR' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                   >
                     ₹ INR
                   </button>
                   <button 
                    onClick={() => setCurrency('USD')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${currency === 'USD' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                   >
                     $ USD
                   </button>
                </div>
              </nav>
              <div className="w-px h-6 bg-neutral-800" />
              <div className="flex items-center gap-5">
                <NotificationBell />
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-sm font-bold text-neutral-300 hover:text-white rounded-xl transition-all border border-neutral-700"
                >
                  लॉग आउट
                </button>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-3">
              <NotificationBell />
              <button 
                onClick={toggleMenu}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-all active:scale-95"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span className="text-xs font-bold uppercase tracking-wider">मेनू</span>
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
                <Link 
                  href="/dashboard" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-indigo-600/20 transition-colors">
                    <LayoutDashboard className="w-5 h-5 group-hover:text-indigo-400" />
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
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-indigo-600/20 transition-colors">
                    <BookOpen className="w-5 h-5 group-hover:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold">मेरे पाठ्यक्रम</p>
                    <p className="text-[10px] text-neutral-500 uppercase">My Learning</p>
                  </div>
                </Link>
                
                <Link 
                  href="/dashboard/profile" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-2xl text-neutral-300 hover:text-white hover:bg-neutral-800/50 transition-all border border-transparent hover:border-neutral-700 group"
                >
                  <div className="p-2 bg-neutral-950 rounded-lg group-hover:bg-indigo-600/20 transition-colors">
                    <User className="w-5 h-5 group-hover:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-bold">प्रोफ़ाइल</p>
                    <p className="text-[10px] text-neutral-500 uppercase">Settings</p>
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
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-indigo-400 transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">होम</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-indigo-400 transition-colors">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">प्रोफ़ाइल</span>
        </Link>
        <button 
          onClick={toggleMenu}
          className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center -mt-8 shadow-xl shadow-indigo-500/30 border-4 border-neutral-950 text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link href="/dashboard/notifications" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-indigo-400 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">सेटिंग्स</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-red-500/70"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">निकास</span>
        </button>
      </div>

      {/* Mobile Sticky CTA Overlay logic if needed */}
    </div>
  );
}
