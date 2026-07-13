'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { timeAgo } from '@/lib/time';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'success' | 'warning';
  is_read: number;
  created_at: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json() as any;
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // On mount: if user is authenticated (notifications endpoint returns 200)
    // and we have a device_id in localStorage, link them so the device
    // is associated with the user for targeted push delivery.
    const associateDevice = async () => {
      try {
        if (typeof window === 'undefined') return;
        const deviceId = localStorage.getItem('lms_device_id');
        if (!deviceId) return;

        const check = await fetch('/api/notifications/my-devices');
        if (!check.ok) return;

        const flagKey = `lms_device_associated_${deviceId}`;
        if (sessionStorage.getItem(flagKey) === '1') return;

        const res = await fetch('/api/notifications/associate-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId }),
        });
        if (res.ok) {
          sessionStorage.setItem(flagKey, '1');
        }
      } catch (err) {
        // Silent: don't break UI on association failure
        console.debug('Device associate skipped:', err);
      }
    };

    associateDevice();
  }, []);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setNotifications(prev => prev.map(n => 
        (id === 'all' || n.id === id) ? { ...n, is_read: 1 } : n
      ));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
      case 'alert': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-neutral-800"
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-neutral-950" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed md:absolute right-4 md:right-0 top-16 md:top-full mt-2 w-[calc(100vw-32px)] md:w-96 bg-neutral-900 border border-neutral-800 shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col max-h-[70dvh] md:max-h-[80dvh]"
          >
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAsRead('all')}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 font-medium"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 text-sm">
                  You&apos;re all caught up!
                </div>
              ) : (
                <div className="divide-y divide-neutral-800/50">
                  {notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id} 
                      className={`w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 p-4 hover:bg-neutral-800/30 transition-colors flex gap-3 ${n.is_read === 0 ? 'bg-orange-500/5 cursor-pointer' : 'cursor-default'}`}
                      onClick={() => { if (n.is_read === 0) markAsRead(n.id); }}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {getTypeIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-sm font-medium ${n.is_read === 0 ? 'text-white' : 'text-neutral-300'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-neutral-500 flex-shrink-0 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 ${n.is_read === 0 ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {n.message}
                        </p>
                      </div>
                      {n.is_read === 0 && (
                        <div className="flex-shrink-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
