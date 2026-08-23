'use client';

import React, { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { CheckCircle2, Globe, Send, Loader2, Users, MapPin, ChevronRight, Lock } from 'lucide-react';
import { formatLocalDate } from '@/lib/time';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

const inputClass = "w-full bg-white/5 border border-white/10 px-5 py-4 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-neutral-600 rounded-2xl";
const selectClass = "w-full bg-neutral-900/80 border border-white/10 px-5 py-4 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all rounded-2xl appearance-none cursor-pointer";

const CountrySelect = React.memo(function CountrySelect({ value, countries, onChange, className }: any) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className={className}>
        {countries.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.name} ({c.code})</option>)}
      </select>
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
    </div>
  );
});

const StateSelect = React.memo(function StateSelect({ value, states, onChange, className }: any) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className={className}>
        {states.map(s => <option key={s.code} value={s.code} className="bg-neutral-900">{s.name}</option>)}
      </select>
      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
    </div>
  );
});

function FormContent() {
  const { error: showError } = useToast();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [autoEnrolled, setAutoEnrolled] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('hi');
  const [theme, setTheme] = useState<any>({
    primaryColor: '#6366f1',
    backgroundColor: '#0a0a0a',
    borderRadius: '24px',
    animations: true,
    glassmorphism: true
  });

  // Country / District API state
  const [countriesList, setCountriesList] = useState<{name: string, code: string, dialCode: string}[]>([{ name: 'India', code: 'IN', dialCode: '+91' }]);
  const [statesList, setStatesList] = useState<{name: string, code: string}[]>([{ name: 'Other', code: 'OT' }]);

  const [selectedCountry, setSelectedCountry] = useState(countriesList[0]);
  const [selectedState, setSelectedState] = useState(statesList[0]);

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd')
      .then(res => res.json())
      .then(data => {
        const formatted = (data as any[]).map((c: any) => ({ 
          name: c.name.common, 
          code: c.cca2,
          dialCode: c.idd?.root ? `${c.idd.root}${c.idd.suffixes?.[0] || ''}` : '' 
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCountriesList(formatted);
        setSelectedCountry(formatted.find((c: any) => c.code === 'IN') || formatted[0]);
      }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selectedCountry.name })
      })
      .then(res => res.json())
      .then((data: any) => {
        if (data && data.data && data.data.states && data.data.states.length > 0) {
          const formatted = data.data.states.map((s: any) => ({ name: s.name, code: s.state_code || s.name.substring(0, 2).toUpperCase() }));
          setStatesList(formatted);
          setSelectedState(formatted[0]);
        } else {
          setStatesList([{ name: 'Other', code: 'OT' }]);
          setSelectedState({ name: 'Other', code: 'OT' });
        }
      }).catch(() => {
          setStatesList([{ name: 'Other', code: 'OT' }]);
          setSelectedState({ name: 'Other', code: 'OT' });
      });
    }
  }, [selectedCountry]);

  // Memoized field change handler + parsed fields to avoid re-rendering every field on each keystroke
  const onFieldChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);
  const onCountryChange = useCallback((code: string) => {
    setSelectedCountry(countriesList.find(x => x.code === code) || countriesList[0]);
  }, [countriesList]);
  const onStateChange = useCallback((code: string) => {
    setSelectedState(statesList.find(x => x.code === code) || statesList[0]);
  }, [statesList]);

  // Batch state (if linked course has batches)
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [loadingBatches, setLoadingBatches] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/forms/${slug}`)
      .then(res => res.json())
      .then((data: any) => {
        setTemplate(data);
        if (data.fields_json) {
          try {
            const fields = typeof data.fields_json === 'string' ? JSON.parse(data.fields_json) : data.fields_json;
            const initialData: any = {};
            if (Array.isArray(fields)) fields.forEach((f: any) => { if (f.name) initialData[f.name] = ''; });
            setFormData(initialData);
          } catch (e) { console.error(e); }
        }
        if (data.theme_json) {
          try {
            const t = typeof data.theme_json === 'string' ? JSON.parse(data.theme_json) : data.theme_json;
            setTheme((prev: any) => ({ ...prev, ...t }));
          } catch (e) { }
        }
        // Load batches if linked course exists
        if (data.linked_course_id) {
          setLoadingBatches(true);
          fetch(`/api/courses/${data.linked_course_id}/batches`)
            .then(r => r.json())
            .then((bd: any) => {
              setBatches(bd.batches || []);
              if (bd.batches?.length > 0) setSelectedBatchId(bd.batches[0].id);
            })
            .catch(() => {})
            .finally(() => setLoadingBatches(false));
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    
    let emailVal = '';
    let phoneVal = '';
    
    Object.keys(formData).forEach(key => {
      const lower = key.toLowerCase();
      if (lower.includes('email') && formData[key]) emailVal = formData[key];
      if ((lower.includes('phone') || lower.includes('mobile')) && formData[key]) phoneVal = formData[key];
    });

    if (!emailVal && !phoneVal) {
      // eslint-disable-next-line
      setIsDuplicate(false);
      return;
    }

    if (emailVal.length < 5 && phoneVal.length < 10) return;

    const timer = setTimeout(() => {
      setCheckingDuplicate(true);
      const params = new URLSearchParams();
      if (emailVal) params.append('email', emailVal);
      if (phoneVal) params.append('phone', phoneVal);
      
      fetch(`/api/forms/${slug}/check?${params.toString()}`)
        .then(res => res.json())
        .then((data: any) => {
          if (data.exists) setIsDuplicate(true);
          else setIsDuplicate(false);
        })
        .catch(() => {})
        .finally(() => setCheckingDuplicate(false));
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        country: selectedCountry.name,
        country_code: selectedCountry.code,
        district: selectedState.name,
        district_code: selectedState.code,
        selected_batch_id: selectedBatchId || null,
      };
      const res = await fetch(`/api/forms/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json() as any;
      if (res.ok) {
        setSubmitted(true);
        setAutoEnrolled(!!result.auto_enrolled);
        if (result.ai_analysis) {
          try { setAiFeedback(JSON.parse(result.ai_analysis)); }
          catch (e) { setAiFeedback({ feedback: result.ai_analysis }); }
        }
      } else {
        showError(result.error || "Submission failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!slug) return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">No slug provided.</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  if (!template) return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">Form not found.</div>;

  const fields = useMemo<any[]>(() => {
    try { return typeof template.fields_json === 'string' ? JSON.parse(template.fields_json || '[]') : (template.fields_json || []); }
    catch (e) { return []; }
  }, [template]);

  return (
    <div className="min-h-screen selection:bg-orange-500/30 transition-colors duration-700" style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.font }}>
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[60px]"
          style={{ backgroundColor: theme.primaryColor }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[60px]"
          style={{ backgroundColor: theme.secondaryColor || '#ec4899' }}
        />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-20 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className={theme.glassmorphism ? "bg-neutral-900/80 border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl" : ""}
        >
          {!submitted ? (
            <>
              <div className="mb-10">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] mb-4 block" style={{ color: theme.primaryColor }}>
                    {lang === 'hi' ? 'आधिकारिक फॉर्म' : 'Official Form'}
                  </span>
                  <button 
                    onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2"
                  >
                    <Globe className="w-3 h-3" />
                    {lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
                  </button>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
                  {lang === 'hi' ? (template.title_hi || template.title) : template.title}
                </h1>
                <p className="text-neutral-400 text-lg leading-relaxed">
                  {lang === 'hi' ? (template.description_hi || template.description) : template.description}
                </p>
                {template.linked_course_id && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="text-orange-300 text-sm font-medium">
                      {lang === 'hi'
                        ? (template.free_enroll ? 'यह फॉर्म भरने पर आपको कोर्स FREE में मिलेगा (पूरा access)।' : 'यह फॉर्म भरने पर आपको कोर्स में ऑटोमैटिक एक्सेस मिलेगा।')
                        : (template.free_enroll ? 'Submitting this form grants you FREE access to the course.' : 'Submitting this form grants you automatic access to the course.')}
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-7">
                {isDuplicate && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <p className="text-sm font-bold">आप यह फॉर्म पहले ही भर चुके हैं। (You have already submitted this form.)</p>
                  </div>
                )}
                
                {/* Dynamic Fields */}
                {fields.map((field: any) => (
                  <div
                    key={field.name}
                    className="space-y-2"
                  >
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                      {lang === 'hi' ? (field.label_hi || field.label) : field.label} {field.required && <span className="text-orange-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea required={field.required} value={formData[field.name] || ''} onChange={e => onFieldChange(field.name, e.target.value)}
                        placeholder={lang === 'hi' ? 'लिखें...' : 'Write...'} rows={4} className={inputClass + " resize-none"} />
                    ) : field.type === 'select' ? (
                      <div className="relative">
                        <select required={field.required} value={formData[field.name] || ''} onChange={e => onFieldChange(field.name, e.target.value)}
                          className={selectClass}>
                          <option value="" disabled className="bg-neutral-900">{lang === 'hi' ? 'चुनें...' : 'Select...'}</option>
                          {field.options?.map((opt: string) => <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                      </div>
                    ) : (
                      <input type={field.type || 'text'} required={field.required} value={formData[field.name] || ''}
                        onChange={e => onFieldChange(field.name, e.target.value)}
                        placeholder={lang === 'hi' ? (field.label_hi || field.label) : field.label} className={inputClass} />
                    )}
                  </div>
                ))}

                {/* Country Selection */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
                  <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-400" /> {lang === 'hi' ? 'देश (Country)' : 'Country'} <span className="text-orange-500">*</span>
                  </label>
                  <CountrySelect value={selectedCountry.code} countries={countriesList} onChange={onCountryChange} className={selectClass} />
                  <p className="text-xs text-neutral-600">Country Code: <span className="text-orange-400 font-mono font-bold">{selectedCountry.code}</span> | Dial: {selectedCountry.dialCode}</p>
                </motion.div>

                {/* State / District */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
                  <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-400" /> {lang === 'hi' ? 'राज्य (State)' : 'State'} <span className="text-orange-500">*</span>
                  </label>
                  <StateSelect value={selectedState.code} states={statesList} onChange={onStateChange} className={selectClass} />
                  <p className="text-xs text-neutral-600">State Code: <span className="text-orange-400 font-mono font-bold">{selectedState.code}</span></p>
                </motion.div>

                {/* Batch Selection (if course is linked & batches available) */}
                {template.linked_course_id && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-400" /> {lang === 'hi' ? 'Batch चुनें (Select Batch)' : 'Select Batch'}
                    </label>
                    {loadingBatches ? (
                      <div className="flex items-center gap-2 text-neutral-500 text-sm py-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> {lang === 'hi' ? 'Batches load हो रहे हैं...' : 'Loading batches...'}
                      </div>
                    ) : batches.length === 0 ? (
                      <div className="px-5 py-4 bg-neutral-900/50 border border-white/5 rounded-2xl text-neutral-500 text-sm">
                        {lang === 'hi' ? 'कोई batch उपलब्ध नहीं — Default batch में enroll होंगे।' : 'No batches available — you will be enrolled in the default batch.'}
                      </div>
                    ) : (
                      <div className="relative">
                        <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className={selectClass}>
                          {batches.map((b: any) => (
                            <option key={b.id} value={b.id} className="bg-neutral-900">
                               {b.name} {b.start_date ? `— शुरू: ${formatLocalDate(b.start_date)}` : ''} [{b.status}]
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting || isDuplicate || checkingDuplicate}
                    className="w-full py-5 text-white font-black text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] shadow-xl hover:brightness-110 rounded-2xl"
                    style={{ background: theme.gradient || theme.primaryColor, boxShadow: `0 10px 30px -10px ${theme.primaryColor}80` }}>
                    {isSubmitting || checkingDuplicate ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        <Send className="w-5 h-5" /> 
                        {lang === 'hi' ? 'फॉर्म जमा करें' : 'Submit Form'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
                className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <h1 className="text-4xl font-black text-white mb-3">{lang === 'hi' ? 'सफलतापूर्वक जमा!' : 'Submitted Successfully!'}</h1>
              <p className="text-neutral-400 text-lg mb-6">{lang === 'hi' ? 'आपका आवेदन प्राप्त हो गया है। Email check करें।' : 'Your application has been received. Please check your email.'}</p>

              {/* Auto-enrollment badge */}
              {autoEnrolled && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 mb-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-black text-lg mb-1">{lang === 'hi' ? '🎓 Course Access मिल गया!' : '🎓 Course Access Granted!'}</p>
                      <p className="text-neutral-400 text-sm">{lang === 'hi' ? 'आपका account बन गया है और course में enroll हो गए हैं। Login करें (email + OTP) और अभी शुरू करें!' : 'Your account has been created and you are enrolled in the course. Login with email + OTP to start!'}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {aiFeedback && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-left max-w-md mx-auto mb-8">
                  <span className="text-orange-400 text-[10px] font-bold uppercase tracking-widest mb-4 block">{lang === 'hi' ? 'AI त्वरित प्रतिक्रिया' : 'AI Quick Feedback'}</span>
                  <p className="text-neutral-200 text-lg italic leading-relaxed font-medium">
                    &quot;{aiFeedback.feedback || aiFeedback}&quot;
                  </p>
                  {aiFeedback.score && (
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500" style={{ width: `${aiFeedback.score * 10}%` }} />
                      </div>
                      <span className="text-xs font-mono text-neutral-500">{aiFeedback.score}/10</span>
                    </div>
                  )}
                </motion.div>
              )}

              <button onClick={() => window.location.href = '/'}
                className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 mx-auto font-bold">
                {lang === 'hi' ? 'होम पेज पर वापस जाएं' : 'Back to Home'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 py-10 px-6 border-t border-neutral-900 text-center">
        <p className="text-neutral-600 text-xs font-mono">&copy; {new Date().getFullYear()} YAGYA ASHRAM • ENLIGHTENING THE WORLD</p>
      </footer>
    </div>
  );
}

export default function DynamicFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <FormContent />
    </Suspense>
  );
}
