'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Globe, Share2, Building2, User, Sparkles, MapPin, Key, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          setIsLoading(false);
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data: any) => {
        if (data && data.settings) {
          const sObj = data.settings.reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
          }, {});
          setSettings(sObj);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [router]);

  const handleSave = async () => {
    setMessage({ type: '', text: '' });
    setIsSaving(true);

    try {
      const res = await fetch('/api/admin/actions/send-otp', { method: 'POST' });
      if (res.ok) {
        setOtpValue('');
        setModalMessage('');
        setShowOtpModal(true);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage({ type: 'error', text: data.error || 'OTP भेजने में विफल। कृपया दोबारा try करें।' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'सर्वर त्रुटि — OTP भेजा नहीं जा सका।' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue) {
      setModalMessage('कृपया OTP डालें।');
      return;
    }
    setIsSaving(true);
    setModalMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, otp: otpValue })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.ok) {
        setMessage({ type: 'success', text: 'सेटिंग्स सफलतापूर्वक अपडेट की गईं! 🎉' });
        setShowOtpModal(false);
      } else {
        setModalMessage(data.error || 'अपडेट करने में विफल।');
      }
    } catch (err) {
      setModalMessage('सर्वर त्रुटि।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">साइट सेटिंग्स</h1>
          <p className="text-neutral-500 mt-1">ब्रांडिंग, SEO और सोशल मीडिया कॉन्फ़िगरेशन</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          सेव करें
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} font-bold text-sm`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Branding */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" /> बेसिक ब्रांडिंग
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">वेबसाइट का नाम</label>
              <input 
                type="text" 
                value={settings.site_name || ''} 
                onChange={e => handleChange('site_name', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">डैशबोर्ड का नाम</label>
              <input 
                type="text" 
                value={settings.dashboard_name || ''} 
                onChange={e => handleChange('dashboard_name', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* AI & Wallet Charges */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" /> AI & Wallet Charges
          </h3>
          <div className="space-y-4">
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-100">
              AI chat use करने पर student wallet से हर request पर ₹ deduct होता है। Custom top-up का default amount भी यहीं से set होता है.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Default Custom Top-up (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.ai_featured_pack_amount_rupees || '101'}
                  onChange={e => handleChange('ai_featured_pack_amount_rupees', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">AI Request Charge (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.ai_credit_deduction_per_request || '2'}
                  onChange={e => handleChange('ai_credit_deduction_per_request', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Founder Info */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-orange-400" /> फाउंडर विवरण
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">फाउंडर का नाम</label>
              <input 
                type="text" 
                value={settings.founder_name || ''} 
                onChange={e => handleChange('founder_name', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">गूगल नॉलेज पैनल URL</label>
              <input 
                type="text" 
                value={settings.founder_google_panel || ''} 
                onChange={e => handleChange('founder_google_panel', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">फाउंडर वेबसाइट</label>
              <input 
                type="text" 
                value={settings.founder_website || ''} 
                onChange={e => handleChange('founder_website', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" /> कंपनी विवरण
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">पैरेंट कंपनी (Parent)</label>
              <input 
                type="text" 
                value={settings.parent_company || ''} 
                onChange={e => handleChange('parent_company', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">चाइल्ड कंपनी (Child)</label>
              <input 
                type="text" 
                value={settings.child_company || ''} 
                onChange={e => handleChange('child_company', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Contact & Address */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-400" /> संपर्क और पता (Contact & Address)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">मुख्य संपर्क फ़ोन (Primary Phone)</label>
              <input 
                type="text" 
                value={settings.contact_phone || ''} 
                onChange={e => handleChange('contact_phone', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">फाउंडर फ़ोन (Founder Phone)</label>
              <input 
                type="text" 
                value={settings.founder_phone || ''} 
                onChange={e => handleChange('founder_phone', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">संस्था का पता (Full Address)</label>
              <textarea 
                rows={2}
                value={settings.site_address || ''} 
                onChange={e => handleChange('site_address', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">LMS ईमेल (LMS Queries)</label>
               <input 
                 type="email" 
                 value={settings.lms_email || ''} 
                 onChange={e => handleChange('lms_email', e.target.value)}
                 className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">आश्रम ईमेल (Official)</label>
               <input 
                 type="email" 
                 value={settings.official_email || ''} 
                 onChange={e => handleChange('official_email', e.target.value)}
                 className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">फाउंडर ईमेल (Founder Official)</label>
               <input 
                 type="email" 
                 value={settings.founder_email || ''} 
                 onChange={e => handleChange('founder_email', e.target.value)}
                 className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">पेरेंट कंपनी ईमेल (Parent Company)</label>
               <input 
                 type="email" 
                 value={settings.parent_company_email || ''} 
                 onChange={e => handleChange('parent_company_email', e.target.value)}
                 className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
               />
             </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" /> सोशल मीडिया हैंडल्स
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">फाउंडर हैंडल (@acharypdt)</label>
              <input 
                type="text" 
                value={settings.founder_social_handle || ''} 
                onChange={e => handleChange('founder_social_handle', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">यज्ञ आश्रम हैंडल (@yagyaashram)</label>
              <input 
                type="text" 
                value={settings.yagya_ashram_social_handle || ''} 
                onChange={e => handleChange('yagya_ashram_social_handle', e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-md overflow-y-auto max-h-[95vh] shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-violet-500/10">
              <h3 className="text-xl font-bold text-violet-500 flex items-center gap-2">
                <Key className="w-5 h-5" /> OTP वेरिफिकेशन
              </h3>
              <button onClick={() => setShowOtpModal(false)} aria-label="Close modal" className="p-2 hover:bg-violet-500/20 rounded-lg text-violet-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmSave} className="p-8 space-y-6">
              <div className="bg-violet-500/10 text-violet-400 p-4 rounded-xl border border-violet-500/20 text-sm leading-relaxed">
                सेटिंग्स बदलने के लिए आपके एडमिन ईमेल पर 6 अंकों का OTP भेजा गया है। OTP डालकर सेव करें।
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-400 flex items-center gap-2">
                  <Key className="w-4 h-4" /> एडमिन OTP (Admin Verification)
                </label>
                <input
                  type="text"
                  required
                  value={otpValue}
                  onChange={e => setOtpValue(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none text-center tracking-widest text-lg font-bold"
                />
              </div>
              {modalMessage && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                  {modalMessage}
                </div>
              )}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-3 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !otpValue}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-500/20"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> सेव करें</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
