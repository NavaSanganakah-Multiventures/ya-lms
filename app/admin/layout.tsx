'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, LayoutDashboard, Users, BookOpen, Settings, LogOut, Layout, Menu, X, Mail, GraduationCap, Layers, Sparkles, Crown, Send, Globe, Wallet, AlertTriangle, GitBranch, Share2, ShoppingBag, FileQuestion, Tag, Home, TrendingUp, Trophy, CalendarDays } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useCurrency } from '@/hooks/useCurrency';
import { useSessionGuard, SessionWarningModal, SessionExpiredModal } from '@/hooks/useSessionGuard';
import { motion, AnimatePresence } from 'motion/react';
import AdminAI from '@/components/AdminAI';
import { BackgroundUploadProvider } from '@/components/BackgroundUploadManager';
import { ToastProvider } from '@/contexts/ToastContext';

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
  // isAuthChecked prevents rendering admin-only nav links before auth is confirmed
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const [siteSettings, setSiteSettings] = useState<any>({});
  useEffect(() => {
    // Fetch settings and auth concurrently — prevents sequential waterfall
    Promise.all([
      fetch('/api/settings')
        .then(res => res.json())
        .then((data: any) => setSiteSettings(data.settings || {}))
        .catch(() => {}),
      fetch('/api/auth/me')
        .then(res => res.json())
        .then((data: any) => {
          const u = data.user || null;
          if (u && u.role === 'student') {
            window.location.href = '/dashboard';
          } else {
            setUser(u);
          }
        })
        .catch(() => {})
    ]).finally(() => setIsAuthChecked(true));
  }, []);

  const navGroups = [
    {
      title: 'मुख्य (Main)',
      links: [
        { href: '/admin', icon: LayoutDashboard, label: 'अवलोकन (Overview)' },
        { href: '/admin/analytics', icon: TrendingUp, label: 'एनालिटिक्स (Analytics)', adminOnly: true },
      ]
    },
    {
      title: 'शिक्षा (Academic)',
      links: [
        { href: '/admin/courses', icon: BookOpen, label: 'पाठ्यक्रम (Courses)' },
        { href: '/admin/books', icon: BookOpen, label: 'पुस्तकें (Books)' },
        { href: '/admin/batches', icon: Layers, label: 'बैच (Batches)' },
        { href: '/admin/exams', icon: FileQuestion, label: 'परीक्षा / Quizzes' },
        { href: '/admin/forms', icon: Layout, label: 'फॉर्म (Forms)' },
        { href: '/admin/gamification', icon: Trophy, label: 'Gamification (XP/Badges)', adminOnly: true },
      ]
    },
    {
      title: 'प्रबंधन (Management)',
      links: [
        { href: '/admin/users', icon: Users, label: 'उपयोगकर्ता (Users)', adminOnly: true },
        { href: '/admin/subscribers', icon: Users, label: 'सब्सक्राइबर', adminOnly: true },
        { href: '/admin/enrollments', icon: GraduationCap, label: 'नामांकन (Enrollments)', adminOnly: true },
        { href: '/admin/leave-requests', icon: CalendarDays, label: 'Leave प्रबंधन (Leave Mgmt)' },
      ]
    },
    {
      title: 'वित्तीय (Finance)',
      links: [
        { href: '/admin/accounting', icon: Wallet, label: 'लेखा-जोखा (Accounting)', adminOnly: true },
        { href: '/admin/coupons', icon: Tag, label: 'Coupons', adminOnly: true },
        { href: '/admin/subscriptions', icon: Crown, label: 'Plans', adminOnly: true },
        { href: '/admin/credits', icon: Wallet, label: 'Credit Packs', adminOnly: true },
      ]
    },
    {
      title: 'संचार (Marketing)',
      links: [
        { href: '/admin/broadcast', icon: Send, label: 'ब्रॉडकास्ट', adminOnly: true },
        { href: '/admin/release-automation', icon: GitBranch, label: 'Release Automation', adminOnly: true },
        { href: '/admin/social-integrations', icon: Share2, label: 'Social Integrations', adminOnly: true },
        { href: '/admin/integrations', icon: Share2, label: 'Integrations', adminOnly: true },
        { href: '/admin/emails', icon: Mail, label: 'ईमेल ड्राफ्ट्स', adminOnly: true },
        { href: '/admin/merchant', icon: ShoppingBag, label: 'Google Merchant', adminOnly: true },
      ]
    },
    {
      title: 'सिस्टम (System)',
      links: [
        { href: '/admin/error-sessions', icon: AlertTriangle, label: 'Error Sessions', adminOnly: true },
        { href: '/admin/settings', icon: Globe, label: 'साइट सेटिंग्स', adminOnly: true },

        { href: '/admin/database', icon: Database, label: 'Database' },
        { href: '/dashboard', icon: Settings, label: 'छात्र दृश्य (Student View)' },
      ]
    }
  ];

  const filteredGroups = navGroups.map(group => ({
    ...group,
    // Wait for auth check before filtering — prevents admin links flashing for non-admins
    links: group.links.filter(link => !link.adminOnly || (isAuthChecked && user?.role === 'admin'))
  })).filter(group => group.links.length > 0);

  return (
    <ToastProvider>
    <BackgroundUploadProvider>
      <div className="h-screen overflow-hidden flex bg-neutral-950 text-neutral-100 font-sans selection:bg-orange-500/30">
      {/* Desktop Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex flex-col hidden md:flex overflow-hidden">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 mr-3">
             <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">{siteSettings.site_name || 'Adityanveshan'}</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
          {filteredGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-3">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.links.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                  >
                    <link.icon className="w-4 h-4 group-hover:text-orange-500 transition-colors" />
                    <span className="text-sm font-bold">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full border border-transparent hover:border-red-500/20">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-bold">लॉग आउट</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Area (Desktop & Mobile) */}
        <header className="h-16 shrink-0 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex items-center justify-between gap-3 px-4 w-full">
          <div className="min-w-0 flex items-center gap-2 md:hidden">
            <button 
              onClick={toggleMenu}
              className="p-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white transition-all active:scale-95"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="truncate text-base font-bold tracking-tight text-white">{siteSettings.site_name || 'Adityanveshan'} Admin</span>
          </div>
          
          <div className="hidden md:block"></div> {/* Spacer for desktop */}
          
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex bg-neutral-800 p-1 rounded-lg border border-neutral-700">
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
            {user?.role === 'admin' && (
              <Link
                href="/admin/error-sessions"
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200 shadow-lg shadow-red-950/20 transition-all hover:border-red-400/50 hover:bg-red-500/20 hover:text-white"
                title="Error Sessions"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden lg:inline">Errors</span>
              </Link>
            )}
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
              <nav className="px-4 py-6 space-y-1 max-h-[70dvh] overflow-y-auto">
                {filteredGroups.flatMap(g => g.links).map((link) => (
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
                  <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-4 px-4 py-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-bold border border-transparent hover:border-red-500/20 w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    लॉग आउट
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-neutral-900/95 backdrop-blur-2xl border-t border-neutral-800 flex items-center justify-around px-2 z-50 pb-safe shrink-0">
          <Link href="/admin" className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 hover:text-orange-400 transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold">अवलोकन</span>
          </Link>
          <Link href="/admin/courses" className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 hover:text-orange-400 transition-colors">
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold">पाठ्यक्रम</span>
          </Link>
          <button 
            onClick={toggleMenu}
            className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 hover:text-orange-400 transition-colors -mt-4"
          >
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 -mt-6 border-4 border-neutral-900">
              <Menu className="w-5 h-5 text-white" />
            </div>
            <span className="text-[9px] font-bold -mt-1">मेन्यू</span>
          </button>
          <Link href="/admin/users" className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 hover:text-orange-400 transition-colors">
            <Users className="w-5 h-5" />
            <span className="text-[9px] font-bold">उपयोगकर्ता</span>
          </Link>
          <Link href="/admin/settings" className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-500 hover:text-orange-400 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="text-[9px] font-bold">सेटिंग्स</span>
          </Link>
        </nav>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-28 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>

        {/* Global Admin AI Toggle */}
        <button 
          onClick={() => setIsAdminAIOpen(true)}
          className="fixed bottom-5 right-5 bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 group transition-all hover:scale-105 z-40 border border-orange-500/30 sm:bottom-8 sm:right-8"
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
    </ToastProvider>
  );
}
