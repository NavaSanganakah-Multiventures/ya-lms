'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Target, Trophy, User, FileQuestion, ClipboardList, Settings, Crown, Video, CalendarDays, Wallet, LogOut
} from 'lucide-react';

interface MobileMenuProps {
  onBuyCredits: () => void;
  credits: number;
  onLogout: () => void;
  onClose: () => void;
  currency: string;
  onCurrencyChange: (currency: 'INR' | 'USD') => void;
  t: (key: string) => string;
}

export function MobileMenu({
  onBuyCredits,
  credits,
  onLogout,
  onClose,
  currency,
  onCurrencyChange,
  t,
}: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const menuSections = [
    {
      title: 'शिक्षा',
      items: [
        {
          href: '/dashboard',
          label: 'सभी कोर्स',
          sublabel: 'Browse All',
          icon: <LayoutDashboard className="w-5 h-5" />,
        },
        {
          href: '/dashboard/my-courses',
          label: 'मेरे कोर्स',
          sublabel: 'My Learning',
          icon: <BookOpen className="w-5 h-5" />,
        },
        {
          href: '/dashboard/analytics',
          label: 'My Progress',
          sublabel: 'Performance',
          icon: <Target className="w-5 h-5" />,
        },
        {
          href: '/dashboard/trophies',
          label: 'Trophy Room',
          sublabel: 'Achievements',
          icon: <Trophy className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'परीक्षाएं',
      items: [
        {
          href: '/dashboard/exams',
          label: 'Exams & Quizzes',
          sublabel: 'Assessments',
          icon: <FileQuestion className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'खाता',
      items: [
        {
          href: '/dashboard/profile',
          label: 'प्रोफ़ाइल',
          sublabel: 'Profile Settings',
          icon: <User className="w-5 h-5" />,
        },
        {
          href: '/dashboard/settings',
          label: 'सेटिंग्स',
          sublabel: 'Preferences',
          icon: <Settings className="w-5 h-5" />,
        },
        {
          href: '/dashboard/forms',
          label: 'Forms',
          sublabel: 'Registration',
          icon: <ClipboardList className="w-5 h-5" />,
        },
        {
          href: '/dashboard/individual-bookings',
          label: 'My Classes',
          sublabel: 'Bookings',
          icon: <Video className="w-5 h-5" />,
        },
        {
          href: '/dashboard/leave',
          label: 'Leave',
          sublabel: 'Apply & History',
          icon: <CalendarDays className="w-5 h-5" />,
        },
      ],
    },
    {
      title: 'प्रीमियम',
      items: [
        {
          href: '/dashboard/subscription',
          label: 'Subscription',
          sublabel: 'All Courses Access',
          icon: <Crown className="w-5 h-5" />,
        },
      ],
    },
  ];

  return (
    <div className="px-4 py-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Wallet */}
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/20 p-2 text-orange-200">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Wallet</p>
              <p className="text-xs text-orange-100/70">₹{credits} balance</p>
            </div>
          </div>
          <button
            onClick={() => {
              router.push('/dashboard/wallet');
              onClose();
            }}
            className="rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white shadow-lg shadow-orange-950/30 hover:bg-orange-500 transition-all active:scale-95"
          >
            Open
          </button>
        </div>
      </div>

      {/* Currency Preference */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
          Currency Preference
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onCurrencyChange('INR')}
            className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
              currency === 'INR'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            ₹ INR
          </button>
          <button
            onClick={() => onCurrencyChange('USD')}
            className={`rounded-xl px-3 py-2 text-xs font-black transition-all ${
              currency === 'USD'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
            }`}
          >
            $ USD
          </button>
        </div>
      </div>

      {/* Menu Sections */}
      {menuSections.map((section, idx) => (
        <div key={idx}>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 px-2">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item, itemIdx) => (
              <Link
                key={itemIdx}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all border ${
                  isActive(item.href)
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'border-transparent hover:bg-neutral-800/50 text-neutral-300 hover:text-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${
                    isActive(item.href)
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{item.label}</p>
                  <p className="text-[10px] text-neutral-500 uppercase">{item.sublabel}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="pt-4 mt-4 border-t border-neutral-800">
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-medium border border-transparent hover:border-red-500/20"
        >
          <div className="p-2 bg-red-500/10 rounded-lg flex-shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">लॉग आउट</p>
            <p className="text-[10px] text-red-500/50 uppercase">Logout</p>
          </div>
        </button>
      </div>
    </div>
  );
}
