'use client';

import { useEffect, useState, Suspense } from 'react';
import { Loader2, CheckCircle2, ChevronRight, Send } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

function FormContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/forms/${slug}`)
      .then(res => res.json())
      .then((data: any) => {
        setTemplate(data);
        if (data.fields_json) {
           const fields = JSON.parse(data.fields_json);
           const initialData: any = {};
           fields.forEach((f: any) => initialData[f.name] = '');
           setFormData(initialData);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json() as any;
      if (res.ok) {
        setSubmitted(true);
        if (result.ai_analysis) {
           try {
             setAiFeedback(JSON.parse(result.ai_analysis));
           } catch(e) {
             setAiFeedback({ feedback: result.ai_analysis });
           }
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

  const fields = JSON.parse(template.fields_json || '[]');

  return (
    <div className="min-h-screen bg-neutral-950 selection:bg-indigo-500/30">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-20 lg:py-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {!submitted ? (
            <>
              <div className="mb-12">
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 block">आधिकारिक फॉर्म</span>
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6">
                  {template.title}
                </h1>
                <p className="text-neutral-400 text-lg leading-relaxed">
                  {template.description}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {fields.map((field: any, idx: number) => (
                  <motion.div 
                    key={field.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="space-y-3"
                  >
                    <label className="text-sm font-bold text-neutral-300 flex items-center gap-2">
                       {field.label} {field.required && <span className="text-orange-500">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        placeholder={`लिखें...`}
                        rows={4}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none placeholder:text-neutral-700"
                      />
                    ) : field.type === 'select' ? (
                      <div className="relative">
                        <select
                          required={field.required}
                          value={formData[field.name] || ''}
                          onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                          className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-neutral-900">चुनें...</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                           <ChevronRight className="w-4 h-4 text-neutral-500 rotate-90" />
                        </div>
                      </div>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                        placeholder={field.label}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-neutral-700"
                      />
                    )}
                  </motion.div>
                ))}

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        फॉर्म जमा करें (Submit)
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-10">
               <motion.div 
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
               >
                 <CheckCircle2 className="w-12 h-12" />
               </motion.div>
               <h1 className="text-4xl font-black text-white mb-4">सफलतापूर्वक जमा किया गया!</h1>
               <p className="text-neutral-400 text-lg mb-12">आपके आवेदन की समीक्षा की जा रही है।</p>
               
               {aiFeedback && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-left max-w-md mx-auto relative overflow-hidden"
                 >
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Image src="https://picsum.photos/seed/ai/200/200" alt="AI" width={80} height={80} referrerPolicy="no-referrer" />
                   </div>
                   <div className="relative z-10">
                      <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest mb-4 block">AI त्वरित प्रतिक्रिया (Instant Feedback)</span>
                      <p className="text-neutral-200 text-lg italic leading-relaxed font-medium">
                        &quot;{aiFeedback.feedback || aiFeedback}&quot;
                      </p>
                      {aiFeedback.score && (
                        <div className="mt-6 flex items-center gap-2">
                           <div className="h-1 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${aiFeedback.score * 10}%` }} />
                           </div>
                           <span className="text-xs font-mono text-neutral-500">{aiFeedback.score}/10</span>
                        </div>
                      )}
                   </div>
                 </motion.div>
               )}
               
               <div className="mt-12">
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 mx-auto font-bold"
                  >
                    होम पेज पर वापस जाएं
                    <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 py-10 px-6 border-t border-neutral-900 text-center">
         <p className="text-neutral-600 text-xs font-mono">
            &copy; {new Date().getFullYear()} YAGYA ASHRAM • ENLIGHTENING THE WORLD
         </p>
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
