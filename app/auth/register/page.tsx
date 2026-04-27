'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, User, Mail, Phone, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: 'IN',
    district: '01',
    otp: ''
  });
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
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
        router.push('/dashboard');
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
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-indigo-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
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
          {step === 1 ? (
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
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
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
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
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
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">देश (Country)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <input 
                      required
                      type="text" 
                      maxLength={2}
                      placeholder="IN"
                      value={formData.country}
                      onChange={e => setFormData({...formData, country: e.target.value.toUpperCase()})}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none text-center"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">ज़िला कोड (District)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <input 
                      required
                      type="text" 
                      maxLength={2}
                      placeholder="01"
                      value={formData.district}
                      onChange={e => setFormData({...formData, district: e.target.value})}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none text-center"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-medium px-2">{error}</p>}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>आगे बढ़ें (Get OTP) <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyRegister} className="space-y-6 text-center">
              <div>
                 <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
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
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 text-white focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none text-center text-3xl font-black tracking-[0.5em]"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
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
              <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-bold ml-1 transition-colors underline-offset-4 hover:underline">
                लॉगिन करें
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
