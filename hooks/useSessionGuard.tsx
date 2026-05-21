'use client';

/**
 * useSessionGuard — Activity tracker + auto-logout
 *
 * Rules:
 * - Student: logout after 12h inactivity
 * - Admin/Teacher: logout after 3h inactivity
 * - Activity = any mouse move, click, keypress, scroll, touch
 * - Pings /api/auth/refresh every 5 minutes when active
 * - Shows warning modal 2 minutes before inactivity logout
 * - Immediately logs out if backend returns SESSION_EXPIRED / INACTIVITY_LOGOUT
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  STUDENT_INACTIVITY_LIMIT_MS,
  getInactivityLimitMsForRole,
  getWarningDelayMs,
} from './sessionGuardPolicy';

const PING_INTERVAL_MS     = 5  * 60 * 1000;         // ping every 5 min
const ACTIVITY_EVENTS      = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionGuard(loginPath = '/auth/login') {
  const router = useRouter();
  const lastActivityRef  = useRef<number>(0);
  const warningTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitMsRef       = useRef<number>(STUDENT_INACTIVITY_LIMIT_MS); // Default Student 12h
  const [showWarning, setShowWarning]     = useState(false);
  const [logoutReason, setLogoutReason]   = useState<'inactivity' | 'expired' | null>(null);

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ── Clear timers ────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (warningTimerRef.current)  clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current)   clearTimeout(logoutTimerRef.current);
    if (pingIntervalRef.current)  clearInterval(pingIntervalRef.current);
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async (reason: 'inactivity' | 'expired') => {
    setLogoutReason(reason);
    setShowWarning(false);
    clearTimers();
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (_) {}
    // Brief delay so modal is visible, then redirect
    setTimeout(() => router.push(loginPath), 1800);
  }, [router, loginPath, clearTimers]);

  // ── Reset inactivity countdown ───────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    if (warningTimerRef.current)  clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current)   clearTimeout(logoutTimerRef.current);

    // Show warning 2 min before auto-logout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, getWarningDelayMs(limitMsRef.current));

    // Auto-logout after inactivity limit
    logoutTimerRef.current = setTimeout(() => {
      logout('inactivity');
    }, limitMsRef.current);
  }, [logout]);

  // ── Activity ping to backend ─────────────────────────────────────────────
  const pingServer = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json() as any;
        limitMsRef.current = getInactivityLimitMsForRole(data.role);
      } else if (res.status === 401) {
        const data = await res.json() as any;
        const reason = data.code === 'INACTIVITY_LOGOUT' ? 'inactivity' : 'expired';
        logout(reason);
      }
    } catch (_) {
      // Network error — silently ignore, don't logout
    }
  }, [logout]);

  // ── Initialize ───────────────────────────────────────────────────────────
  useEffect(() => {
    // BUG-05 fix: useRef pattern use karo taaki stale closures na hon.
    // pingServer aur resetInactivityTimer ko ref mein store karo — latest version hamesha available rahega.
    const pingRef = { current: pingServer };
    const resetRef = { current: resetInactivityTimer };
    pingRef.current = pingServer;
    resetRef.current = resetInactivityTimer;

    // Start inactivity timers
    setTimeout(() => resetRef.current(), 0);

    // Activity listeners reset the timer
    const handleActivity = () => resetRef.current();
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    // Ping server every 5 minutes
    pingIntervalRef.current = setInterval(() => pingRef.current(), PING_INTERVAL_MS);

    // Initial ping to validate session on mount
    setTimeout(() => pingRef.current(), 0);

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount — refs handle latest callback versions

  return { showWarning, logoutReason, extendSession: resetInactivityTimer };
}

// ── Warning Modal Component ────────────────────────────────────────────────
interface SessionWarningModalProps {
  show: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionWarningModal({ show, onExtend, onLogout }: SessionWarningModalProps) {
  const [countdown, setCountdown] = useState(120); // 2 min

  useEffect(() => {
    if (!show) {
      setTimeout(() => setCountdown(120), 0);
      return;
    }
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-orange-500/30 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-orange-500/10 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-black text-white">Session Expire होने वाला है!</h2>
            <p className="text-neutral-400 text-sm mt-2">निष्क्रियता सीमा पूरी होने वाली है (Student: 12 घंटे, Admin/Teacher: 3 घंटे)। Session जारी रखने के लिए नीचे click करें।</p>
          </div>

          {/* Countdown */}
          <div className="w-full py-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
            <p className="text-orange-300 font-black text-2xl tabular-nums">
              {mins}:{secs.toString().padStart(2, '0')}
            </p>
            <p className="text-orange-400/60 text-xs font-bold mt-1">में auto-logout</p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onExtend}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-500/20 text-sm"
            >
              ✅ जारी रखें
            </button>
            <button
              onClick={onLogout}
              className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl font-bold transition-all text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Session Expired Modal ────────────────────────────────────────────────
export function SessionExpiredModal({ reason }: { reason: 'inactivity' | 'expired' | null }) {
  if (!reason) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-red-500/30 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-white">
          {reason === 'inactivity' ? 'Inactivity के कारण Logout हुए' : 'Session Expire हो गया'}
        </h2>
        <p className="text-neutral-400 text-sm">
          {reason === 'inactivity'
            ? 'निष्क्रियता सीमा पूरी होने के कारण आपको logout किया गया (Student: 12 घंटे, Admin/Teacher: 3 घंटे)।'
            : 'आपका session expire हो गया। कृपया दोबारा login करें।'}
        </p>
        <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs animate-pulse">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
          Login page पर redirect हो रहे हैं...
        </div>
      </div>
    </div>
  );
}
