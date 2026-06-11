'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  color?: 'orange' | 'neutral' | 'yellow' | 'violet';
}

interface NavDropdownProps {
  label: string;
  icon?: React.ReactNode;
  items: NavItem[];
  color?: 'orange' | 'neutral' | 'yellow' | 'violet';
  className?: string;
}

const colorClasses = {
  orange: 'text-orange-400 hover:text-orange-300 group-hover:bg-orange-500/10',
  neutral: 'text-neutral-400 hover:text-white group-hover:bg-neutral-700/50',
  yellow: 'text-yellow-400 hover:text-yellow-300 group-hover:bg-yellow-500/10',
  violet: 'text-violet-400 hover:text-violet-300 group-hover:bg-violet-500/10',
};

export function NavDropdown({ label, icon, items, color = 'neutral', className = '' }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Check if any item matches current route
  const isActive = items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colorClass = colorClasses[color];

  return (
    <div ref={menuRef} className={`relative group ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive ? `${colorClass} bg-opacity-20` : colorClass
        }`}
      >
        {icon && <span className="w-4 h-4">{icon}</span>}
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 min-w-max bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="py-2">
              {items.map((item, idx) => {
                const itemActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 ${
                      itemActive ? 'bg-neutral-800/80 border-l-2 border-orange-500' : 'hover:bg-neutral-800/50'
                    }`}
                  >
                    {item.icon && <span className="w-4 h-4 mt-0.5 flex-shrink-0">{item.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-neutral-500 truncate">{item.description}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
