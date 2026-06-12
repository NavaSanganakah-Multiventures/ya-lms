'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Target, Trophy, User, FileQuestion, ClipboardList, Settings, Crown, Video, CalendarDays, Sparkles, Plus } from 'lucide-react';
import { NavDropdown } from './NavDropdown';

interface DesktopNavProps {
  onBuyCredits: () => void;
  credits: number;
  currency: string;
  onCurrencyChange: (currency: 'INR' | 'USD') => void;
  t: (key: string) => string;
}

export function DesktopNav({ onBuyCredits, credits, currency, onCurrencyChange, t }: DesktopNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Learning group
  const learningItems = [
    { href: '/dashboard', label: 'सभी कोर्स', description: 'Browse All Courses', icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/dashboard/my-courses', label: 'मेरे कोर्स', description: 'My Learning', icon: <BookOpen className="w-4 h-4" /> },
    { href: '/dashboard/analytics', label: 'My Progress', description: 'Performance & Stats', icon: <Target className="w-4 h-4" /> },
    { href: '/dashboard/trophies', label: 'Trophy Room', description: 'Achievements', icon: <Trophy className="w-4 h-4" /> },
  ];

  // Account group
  const accountItems = [
    { href: '/dashboard/profile', label: 'प्रोफ़ाइल', description: 'Profile Settings', icon: <User className="w-4 h-4" /> },
    { href: '/dashboard/settings', label: 'सेटिंग्स', description: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { href: '/dashboard/forms', label: 'Forms', description: 'Registration Forms', icon: <ClipboardList className="w-4 h-4" /> },
    { href: '/dashboard/leave', label: 'Leave', description: 'Apply & History', icon: <CalendarDays className="w-4 h-4" /> },
    { href: '/dashboard/individual-bookings', label: 'My Classes', description: 'Individual Bookings', icon: <Video className="w-4 h-4" /> },
  ];

  return (
    <div className="hidden md:flex items-center gap-1">
      {/* Learning Dropdown */}
      <NavDropdown
        label="शिक्षा"
        icon={<BookOpen className="w-4 h-4" />}
        items={learningItems}
        color="orange"
      />

      {/* Exams - Direct Link */}
      <Link
        href="/dashboard/exams"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive('/dashboard/exams')
            ? 'text-orange-400 bg-orange-500/10'
            : 'text-neutral-400 hover:text-white'
        }`}
      >
        <FileQuestion className="w-4 h-4" />
        Exams
      </Link>

      {/* Subscription - Premium */}
      <Link
        href="/dashboard/subscription"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive('/dashboard/subscription')
            ? 'text-violet-300 bg-violet-500/10'
            : 'text-violet-400 hover:text-violet-300'
        }`}
      >
        <Crown className="w-4 h-4" />
        {t('dashboard.subscription') || 'Subscription'}
      </Link>

      {/* Account Dropdown */}
      <NavDropdown
        label="खाता"
        icon={<User className="w-4 h-4" />}
        items={accountItems}
        color="neutral"
      />

      <div className="w-px h-6 bg-neutral-800 mx-2" />

      {/* Preferences */}
      <div className="flex items-center gap-2 ml-2">
        <div className="flex bg-neutral-800 p-1 rounded-lg border border-neutral-700">
          <button
            onClick={() => onCurrencyChange('INR')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
              currency === 'INR'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            ₹ INR
          </button>
          <button
            onClick={() => onCurrencyChange('USD')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
              currency === 'USD'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      <div className="w-px h-6 bg-neutral-800" />

      {/* Credits & CTA */}
      <div className="flex items-center gap-3 ml-2">
        <div className="flex items-center gap-1 bg-neutral-800/80 border border-neutral-700/50 rounded-xl p-1">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-black text-white">{credits}</span>
          </div>
          <button
            onClick={onBuyCredits}
            className="p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            title="Credits खरीदें"
            aria-label="Buy Credits"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
