'use client';

import { useEffect, useState, Suspense } from 'react';
import { Loader2, CheckCircle2, ChevronRight, Send, Globe, MapPin, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';

// Country list with ISO codes
const COUNTRIES: { name: string; code: string; dialCode: string }[] = [
  { name: 'India', code: 'IN', dialCode: '+91' },
  { name: 'United States', code: 'US', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44' },
  { name: 'Canada', code: 'CA', dialCode: '+1' },
  { name: 'Australia', code: 'AU', dialCode: '+61' },
  { name: 'Nepal', code: 'NP', dialCode: '+977' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880' },
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92' },
  { name: 'UAE', code: 'AE', dialCode: '+971' },
  { name: 'Singapore', code: 'SG', dialCode: '+65' },
  { name: 'Germany', code: 'DE', dialCode: '+49' },
  { name: 'France', code: 'FR', dialCode: '+33' },
  { name: 'Japan', code: 'JP', dialCode: '+81' },
  { name: 'China', code: 'CN', dialCode: '+86' },
  { name: 'Other', code: 'OT', dialCode: '+00' },
];

// India states/districts with 2-digit codes
const INDIA_STATES: { name: string; code: string }[] = [
  { name: 'Andhra Pradesh', code: 'AP' },
  { name: 'Arunachal Pradesh', code: 'AR' },
  { name: 'Assam', code: 'AS' },
  { name: 'Bihar', code: 'BR' },
  { name: 'Chhattisgarh', code: 'CG' },
  { name: 'Delhi', code: 'DL' },
  { name: 'Goa', code: 'GA' },
  { name: 'Gujarat', code: 'GJ' },
  { name: 'Haryana', code: 'HR' },
  { name: 'Himachal Pradesh', code: 'HP' },
  { name: 'Jharkhand', code: 'JH' },
  { name: 'Karnataka', code: 'KA' },
  { name: 'Kerala', code: 'KL' },
  { name: 'Madhya Pradesh', code: 'MP' },
  { name: 'Maharashtra', code: 'MH' },
  { name: 'Manipur', code: 'MN' },
  { name: 'Meghalaya', code: 'ML' },
  { name: 'Mizoram', code: 'MZ' },
  { name: 'Nagaland', code: 'NL' },
  { name: 'Odisha', code: 'OD' },
  { name: 'Punjab', code: 'PB' },
  { name: 'Rajasthan', code: 'RJ' },
  { name: 'Sikkim', code: 'SK' },
  { name: 'Tamil Nadu', code: 'TN' },
  { name: 'Telangana', code: 'TS' },
  { name: 'Tripura', code: 'TR' },
  { name: 'Uttar Pradesh', code: 'UP' },
  { name: 'Uttarakhand', code: 'UK' },
  { name: 'West Bengal', code: 'WB' },
  { name: 'Jammu & Kashmir', code: 'JK' },
  { name: 'Ladakh', code: 'LA' },
  { name: 'Chandigarh', code: 'CH' },
  { name: 'Other', code: 'OT' },
];

const inputClass = "w-full bg-white/5 border border-white/10 px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-neutral-600 rounded-2xl";
const selectClass = "w-full bg-neutral-900/80 border border-white/10 px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all rounded-2xl appearance-none cursor-pointer";

function FormContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [autoEnrolled, setAutoEnrolled] = useState(false);
  const [theme, setTheme] = useState<any>({
    primaryColor: '#6366f1',
    backgroundColor: '#0a0a0a',
    borderRadius: '24px',
    animations: true,
    glassmorphism: true
  });

  // Country / District state
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedState, setSelectedState] = useState(INDIA_STATES[0]);

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
        alert(result.error || "Submission failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!slug) return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">No slug provided.</div>;
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!template) return <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">Form not found.</div>;

  let fields: any[] = [];
  try { fields = typeof template.fields_json === 'string' ? JSON.parse(template.fields_json || '[]') : (template.fields_json || []); }
  catch (e) { }

  return (
    <div className="min-h-screen selection:bg-indigo-500/30 transition-colors duration-700" style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.font }}>
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div
          animate={theme.animations ? { scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.1, 0.3, 0.1] } : {}}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px]"
          style={{ backgroundColor: theme.primaryColor }}
        />
        <motion.div
          animate={theme.animations ? { scale: [1.2, 1, 1.2], rotate: [0, -90, 0], opacity: [0.1, 0.2, 0.1] } : {}}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]"
          style={{ backgroundColor: theme.secondaryColor || '#ec4899' }}
        />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-20 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className={theme.glassmorphism ? "bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl" : ""}
        >
          {!submitted ? (
            <>
              <div className="mb-10">
                <span className="text-xs font-bold uppercase tracking-[0.2em] mb-4 block" style={{ color: theme.primaryColor }}>
                  आधिकारिक फॉर्म (Official Form)
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">{template.title}</h1>
                <p className="text-neutral-400 text-lg leading-relaxed">{template.description}</p>
                {template.linked_course_id && (
                  <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-indigo-300 text-sm font-medium">यह फॉर्म भरने पर आपको course में automatic access मिलेगा।</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-7">
                {/* Dynamic Fields */}
                {fields.map((field: any, idx: number) => (
                  <motion.div
                    key={field.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                      {field.label} {field.required && <span className="text-orange-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea required={field.required} value={formData[field.name] || ''} onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder="लिखें..." rows={4} className={inputClass + " resize-none"} />
                    ) : field.type === 'select' ? (
                      <div className="relative">
                        <select required={field.required} value={formData[field.name] || ''} onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                          className={selectClass}>
                          <option value="" disabled className="bg-neutral-900">चुनें...</option>
                          {field.options?.map((opt: string) => <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>)}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                      </div>
                    ) : (
                      <input type={field.type || 'text'} required={field.required} value={formData[field.name] || ''}
                        onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.label} className={inputClass} />
                    )}
                  </motion.div>
                ))}

                {/* Country Selection */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
                  <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" /> देश (Country) <span className="text-orange-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={selectedCountry.code}
                      onChange={e => {
                        const c = COUNTRIES.find(x => x.code === e.target.value) || COUNTRIES[0];
                        setSelectedCountry(c);
                      }}
                      className={selectClass}>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.name} ({c.code})</option>)}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                  </div>
                  <p className="text-xs text-neutral-600">Country Code: <span className="text-indigo-400 font-mono font-bold">{selectedCountry.code}</span> | Dial: {selectedCountry.dialCode}</p>
                </motion.div>

                {/* State / District (only for India) */}
                {selectedCountry.code === 'IN' && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-400" /> राज्य (State) <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <select value={selectedState.code}
                        onChange={e => {
                          const s = INDIA_STATES.find(x => x.code === e.target.value) || INDIA_STATES[0];
                          setSelectedState(s);
                        }}
                        className={selectClass}>
                        {INDIA_STATES.map(s => <option key={s.code} value={s.code} className="bg-neutral-900">{s.name}</option>)}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                    </div>
                    <p className="text-xs text-neutral-600">State Code: <span className="text-indigo-400 font-mono font-bold">{selectedState.code}</span></p>
                  </motion.div>
                )}

                {/* Batch Selection (if course is linked & batches available) */}
                {template.linked_course_id && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" /> Batch चुनें (Select Batch)
                    </label>
                    {loadingBatches ? (
                      <div className="flex items-center gap-2 text-neutral-500 text-sm py-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> Batches load हो रहे हैं...
                      </div>
                    ) : batches.length === 0 ? (
                      <div className="px-5 py-4 bg-neutral-900/50 border border-white/5 rounded-2xl text-neutral-500 text-sm">
                        कोई batch उपलब्ध नहीं — Default batch में enroll होंगे।
                      </div>
                    ) : (
                      <div className="relative">
                        <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className={selectClass}>
                          {batches.map((b: any) => (
                            <option key={b.id} value={b.id} className="bg-neutral-900">
                              {b.name} {b.start_date ? `— शुरू: ${new Date(b.start_date).toLocaleDateString('hi-IN')}` : ''} [{b.status}]
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rotate-90 pointer-events-none" />
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="pt-4">
                  <button type="submit" disabled={isSubmitting}
                    className="w-full py-5 text-white font-black text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] shadow-xl hover:brightness-110 rounded-2xl"
                    style={{ background: theme.gradient || theme.primaryColor, boxShadow: `0 10px 30px -10px ${theme.primaryColor}80` }}>
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><Send className="w-5 h-5" /> फॉर्म जमा करें (Submit)</>)}
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
              <h1 className="text-4xl font-black text-white mb-3">सफलतापूर्वक जमा!</h1>
              <p className="text-neutral-400 text-lg mb-6">आपका आवेदन प्राप्त हो गया है। Email check करें।</p>

              {/* Auto-enrollment badge */}
              {autoEnrolled && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 mb-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-black text-lg mb-1">🎓 Course Access मिल गया!</p>
                      <p className="text-neutral-400 text-sm">आपका account बन गया है और course में enroll हो गए हैं। Login करें (email + OTP) और अभी शुरू करें!</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {aiFeedback && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-left max-w-md mx-auto mb-8">
                  <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4 block">AI त्वरित प्रतिक्रिया</span>
                  <p className="text-neutral-200 text-lg italic leading-relaxed font-medium">
                    &quot;{aiFeedback.feedback || aiFeedback}&quot;
                  </p>
                  {aiFeedback.score && (
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${aiFeedback.score * 10}%` }} />
                      </div>
                      <span className="text-xs font-mono text-neutral-500">{aiFeedback.score}/10</span>
                    </div>
                  )}
                </motion.div>
              )}

              <button onClick={() => window.location.href = '/'}
                className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 mx-auto font-bold">
                होम पेज पर वापस जाएं <ChevronRight className="w-4 h-4" />
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-950"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <FormContent />
    </Suspense>
  );
}
