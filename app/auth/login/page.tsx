'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

const OTP_RESEND_COOLDOWN_SEC = 60;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const redirectForRole = useCallback((role?: string | null) => {
    if (!isMountedRef.current) return;
    const target = role === 'admin' || role === 'teacher' ? '/admin' : '/dashboard';
    router.replace(target);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fallbackTimer = window.setTimeout(() => {
      controller.abort();
      if (mounted) setIsCheckingSession(false);
    }, 3500);

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          if (mounted) setIsCheckingSession(false);
          return;
        }

        const data = await res.json() as { ok?: boolean; role?: string };
        if (data.ok && data.role) {
          if (mounted) redirectForRole(data.role);
          return;
        }

        if (mounted) setIsCheckingSession(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError' && mounted) {
          setIsCheckingSession(false);
        }
      } finally {
        window.clearTimeout(fallbackTimer);
      }
    };

    checkSession();

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
      controller.abort();
    };
  }, [redirectForRole]);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const sendOTP = async (emailAddr: string) => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddr, type: 'login' }),
    });
    const data = await res.json() as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await sendOTP(email);
      setStep('OTP');
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      await sendOTP(email);
      setResendCooldown(OTP_RESEND_COOLDOWN_SEC);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json() as { error?: string; role?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to verify OTP');

      redirectForRole(data.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-semibold text-white tracking-tight">वापसी पर स्वागत है</h3>
        <p className="text-sm text-neutral-400 mt-1">पासवर्ड के बिना तुरंत लॉग इन करें।</p>
      </div>

      <div className="border border-neutral-800 bg-neutral-900/50 p-6 rounded-2xl shadow-xl">
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isCheckingSession ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : step === 'EMAIL' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                ईमेल पता
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm transition-colors"
                  placeholder="अपना ईमेल दर्ज करें"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center rounded-lg border border-transparent bg-orange-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ईमेल से जारी रखें'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-neutral-300 mb-1 text-center">
                वन-टाइम पासवर्ड (OTP)
              </label>
              <input
                id="otp"
                type="text"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="block w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-3 text-white placeholder-neutral-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 text-lg sm:text-2xl text-center tracking-widest transition-colors"
                placeholder="123456"
                maxLength={6}
              />
              <p className="text-xs text-neutral-500 text-center mt-3">
                हमने <span className="text-orange-400 font-medium">{email}</span> पर एक 6-अंकीय कोड भेजा है
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center rounded-lg border border-transparent bg-orange-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'सत्यापित करें और लॉग इन करें'}
            </button>

            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isLoading}
                className="text-sm text-neutral-500 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {resendCooldown > 0
                  ? `OTP दोबारा भेजें (${resendCooldown}s)`
                  : 'OTP दोबारा भेजें'}
              </button>
              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                className="text-sm text-neutral-500 hover:text-white transition-colors"
              >
                दूसरा ईमेल उपयोग करें
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="mt-8 text-center">
        <p className="text-neutral-500 text-sm">
          खाता नहीं है?{' '}
          <Link href="/auth/register" className="text-orange-400 hover:text-orange-300 font-bold ml-1 transition-colors underline-offset-4 hover:underline">
            अभी पंजीकरण करें
          </Link>
        </p>
      </div>
    </div>
  );
}
