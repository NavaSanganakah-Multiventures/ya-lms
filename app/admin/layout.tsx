'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, Layout, Menu, X, Mail, GraduationCap, Layers, Sparkles, Crown, Send } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useCurrency } from '@/hooks/useCurrency';
import { useSessionGuard, SessionWarningModal, SessionExpiredModal } from '@/hooks/useSessionGuard';
import { motion, AnimatePresence } from 'motion/react';
import AdminAI from '@/components/AdminAI';
import { BackgroundUploadProvider } from '@/components/BackgroundUploadManager';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminAIOpen, setIsAdminAIOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();

  // Session guard — admin: 3h session, 1h inactivity logout
  const { showWarning, logoutReason, extendSession } = useSessionGuard('/auth/login');

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (_) {}
    window.location.href = '/auth/login';
  };

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then((data: any) => setUser(data.user || null))
      .catch(() => {});
  }, []);

  const navLinks = [
    { href: '/admin',                  icon: LayoutDashboard, label: 'अवलोकन' },
    { href: '/admin/users',            icon: Users,           label: 'उपयोगकर्ता',     adminOnly: true },
    { href: '/admin/courses',          icon: BookOpen,        label: 'पाठ्यक्रम' },
    { href: '/admin/batches',          icon: Layers,          label: 'बैच' },
    { href: '/admin/enrollments',      icon: GraduationCap,   label: 'नामांकन',       adminOnly: true },
    { href: '/admin/subscriptions',    icon: Crown,           label: 'Subscription Plans', adminOnly: true },
    { href: '/admin/emails',           icon: Mail,            label: 'ईमेल ड्राफ्ट्स',    adminOnly: true },
    { href: '/admin/broadcast',        icon: Send,            label: 'ब्रॉडकास्ट',        adminOnly: true },
    { href: '/admin/forms',            icon: Layout,          label: 'फॉर्म मैनेजमेंट' },
    { href: '/dashboard',              icon: Settings,        label: 'छात्र दृश्य' },
  ].filter(link => !link.adminOnly || user?.role === 'admin');

  return (
    <BackgroundUploadProvider>
      <div className="min-h-screen flex bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30">
      {/* Desktop Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 mr-3">
             <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Adityanveshan</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <Link href="/auth/login" className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full">
            <LogOut className="w-5 h-5" />
            लॉग आउट
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header Area (Desktop & Mobile) */}
        <header className="h-16 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-40 w-full">
          <div className="flex items-center gap-3 md:hidden">
            <button 
              onClick={toggleMenu}
              className="p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white transition-all active:scale-95"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-bold text-lg tracking-tight text-white">Adityanveshan Admin</span>
          </div>
          
          <div className="hidden md:block"></div> {/* Spacer for desktop */}
          
          <div className="flex items-center gap-4">
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
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden fixed inset-x-0 top-16 bg-neutral-900 border-b border-neutral-800 shadow-2xl z-30"
            >
              <nav className="px-4 py-6 space-y-2">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-700"
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-bold">{link.label}</span>
                  </Link>
                ))}
                <div className="pt-4 mt-4 border-t border-neutral-800">
                  <Link 
                    href="/auth/login" 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold border border-transparent hover:border-red-500/20"
                  >
                    <LogOut className="w-5 h-5" />
                    लॉग आउट
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>

        {/* Global Admin AI Toggle */}
        <button 
          onClick={() => setIsAdminAIOpen(true)}
          className="fixed bottom-8 right-8 bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 group transition-all hover:scale-105 z-40 border border-orange-500/30"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="font-bold hidden sm:inline">Admin AI</span>
        </button>

        <AnimatePresence>
          {isAdminAIOpen && (
            <AdminAI isOpen={isAdminAIOpen} onClose={() => setIsAdminAIOpen(false)} />
          )}
        </AnimatePresence>
      </main>
      {/* Session Modals */}
      <SessionWarningModal show={showWarning} onExtend={extendSession} onLogout={handleLogout} />
      <SessionExpiredModal reason={logoutReason} />
    </div>
    </BackgroundUploadProvider>
  );
}
