'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Loader2, User, Mail, Phone, MapPin, ArrowRight, CheckCircle2, Globe, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: 'IN',
    district: '01',
    otp: ''
  });
  const router = useRouter();

  const redirectForRole = useCallback((role?: string | null) => {
    const target = role === 'admin' || role === 'teacher' ? '/admin' : '/dashboard';
    router.replace(target);
    router.refresh();
  }, [router]);

  const [countriesList, setCountriesList] = useState<{name: string, code: string}[]>([{ name: 'India', code: 'IN' }]);
  const [statesList, setStatesList] = useState<{name: string, code: string}[]>([{ name: 'Other', code: 'OT' }]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const fallbackTimer = window.setTimeout(() => {
      controller.abort();
      if (isMounted) setIsCheckingSession(false);
    }, 3500);

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          if (isMounted) setIsCheckingSession(false);
          return;
        }

        const data = await res.json() as { ok?: boolean; role?: string };
        if (data.ok && data.role) {
          redirectForRole(data.role);
          return;
        }

        if (isMounted) setIsCheckingSession(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError' && isMounted) {
          setIsCheckingSession(false);
        }
      } finally {
        window.clearTimeout(fallbackTimer);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      controller.abort();
    };
  }, [redirectForRole]);

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
      .then(res => res.json())
      .then(data => {
        const formatted = (data as any[]).map((c: any) => ({ name: c.name.common, code: c.cca2 })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCountriesList(formatted);
      }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const selectedCountryObj = countriesList.find(c => c.code === formData.country);
    if (selectedCountryObj) {
      fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selectedCountryObj.name })
      })
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.data && data.data.states && data.data.states.length > 0) {
          const formatted = data.data.states.map((s: any) => ({ name: s.name, code: s.state_code || s.name.substring(0, 2).toUpperCase() }));
          setStatesList(formatted);
          setFormData(prev => {
            if (!formatted.find((s: any) => s.code === prev.district)) {
              return { ...prev, district: formatted[0].code };
            }
            return prev;
          });
        } else {
          setStatesList([{ name: 'Other', code: 'OT' }]);
          setFormData(prev => ({...prev, district: 'OT'}));
        }
      }).catch(() => {
          setStatesList([{ name: 'Other', code: 'OT' }]);
          setFormData(prev => ({...prev, district: 'OT'}));
      });
    }
  }, [formData.country, countriesList]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, type: 'register' })
      });
      const data = await res.json() as any;
      if (res.ok) {
        setStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json() as any;
      if (res.ok) {
        redirectForRole(data.role);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-orange-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">यज्ञ आश्रम</h1>
          <p className="text-neutral-500 font-medium">छात्र पंजीकरण (Student Registration)</p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
          {isCheckingSession ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">पूरा नाम (Full Name)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                  <input 
                    required
                    type="text" 
                    placeholder="आपका नाम..."
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-orange-500/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">ईमेल (Email Address)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                  <input 
                    required
                    type="email" 
                    placeholder="example@mail.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-orange-500/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">फोन (Phone)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                  <input 
                    required
                    type="tel" 
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-orange-500/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">देश (Country)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                    <select 
                      required
                      value={formData.country}
                      onChange={e => setFormData({...formData, country: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500/50 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {countriesList.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.name} ({c.code})</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">राज्य (State)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                    <select 
                      required
                      value={formData.district}
                      onChange={e => setFormData({...formData, district: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500/50 transition-all outline-none appearance-none cursor-pointer"
                    >
                      {statesList.map(s => <option key={s.code} value={s.code} className="bg-neutral-900">{s.name}</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-medium px-2">{error}</p>}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>आगे बढ़ें (Get OTP) <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyRegister} className="space-y-6 text-center">
              <div>
                 <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                    <Mail className="w-10 h-10" />
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">ईमेल सत्यापित करें</h2>
                 <p className="text-neutral-500 text-sm">हमने <b>{formData.email}</b> पर एक कोड भेजा है।</p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">OTP कोड</label>
                <input 
                  required
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  value={formData.otp}
                  onChange={e => setFormData({...formData, otp: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 text-white focus:ring-2 focus:ring-orange-500/50 transition-all outline-none text-center text-3xl font-black tracking-[0.5em]"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>पुष्टि करें (Verify & Register) <CheckCircle2 className="w-5 h-5" /></>
                )}
              </button>

              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="text-neutral-500 hover:text-neutral-300 text-sm font-medium transition-colors"
              >
                जानकारी बदलें
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-neutral-500 text-sm">
              पहले से खाता है?{' '}
              <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 font-bold ml-1 transition-colors underline-offset-4 hover:underline">
                लॉगिन करें
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
