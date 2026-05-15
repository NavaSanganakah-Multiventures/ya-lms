'use client';

import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, MessageSquare, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: any) => {
        setSettings(data.settings || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      <div className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
         <div className="grid lg:grid-cols-2 gap-20">
            {/* Info */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
               <span className="text-orange-400 text-xs font-black uppercase tracking-[0.2em] mb-4 block">संपर्क करें</span>
               <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-12">
                  हमसे <br/><span className="text-neutral-500 italic">बात करें</span>
               </h1>
               
               <p className="text-neutral-400 text-lg mb-16 max-w-md">
                  आध्यात्मिक प्रश्नों, पाठ्यक्रमों या सहयोग के लिए बेझिझक हमसे संपर्क करें। हमारी टीम आपकी सहायता के लिए सदैव तत्पर है।
               </p>

               <div className="space-y-10">
                  <div className="flex gap-6 items-start">
                     <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center shrink-0">
                        <Mail className="w-6 h-6 text-orange-400" />
                     </div>
                     <div className="space-y-4">
                        <h4 className="text-sm font-black text-neutral-600 uppercase tracking-widest">आधिकारिक ईमेल (Official Emails)</h4>
                        <div className="grid gap-4">
                           <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl group hover:border-orange-500/30 transition-all">
                              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">LMS Related Queries</p>
                              <p className="text-lg font-bold group-hover:text-orange-400 transition-colors">{settings.lms_email || 'om@lms.navasanganakah.com'}</p>
                           </div>
                           <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl group hover:border-orange-500/30 transition-all">
                              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Academy Official Mail</p>
                              <p className="text-lg font-bold group-hover:text-orange-400 transition-colors">{settings.official_email || 'support@navasanganakah.com'}</p>
                           </div>
                           <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl group hover:border-orange-500/30 transition-all">
                              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Founder Official Mail</p>
                              <p className="text-lg font-bold group-hover:text-orange-400 transition-colors">{settings.founder_email || 'info@navasanganakah.com'}</p>
                           </div>
                           <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl group hover:border-orange-500/30 transition-all">
                              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Parent Company Official</p>
                              <p className="text-lg font-bold group-hover:text-orange-400 transition-colors">{settings.parent_company_email || 'info@navasanganakah.com'}</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-6 items-start">
                     <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center shrink-0">
                        <Phone className="w-6 h-6 text-orange-400" />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-neutral-600 uppercase tracking-widest mb-2">फ़ोन (Contact Numbers)</h4>
                        <p className="text-xl font-bold">{settings.contact_phone || '+91 9669509960'}</p>
                        {settings.founder_phone && (
                           <p className="text-sm text-neutral-500 font-bold mt-1">Founder: {settings.founder_phone}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex gap-6 items-start">
                     <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-orange-400" />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-neutral-600 uppercase tracking-widest mb-2">आश्रम का पता</h4>
                        <p className="text-xl font-bold leading-relaxed">{settings.site_address || 'NavaSanganakah LMS, सुठालिया, राजगढ़, म.प्र.'}</p>
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Form */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-neutral-900 border border-neutral-800 rounded-[50px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
            >
               {!submitted ? (
                 <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <h3 className="text-3xl font-black mb-8">मैसेज भेजें</h3>
                    
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">आपका नाम</label>
                       <input 
                         required
                         type="text" 
                         className="w-full bg-black border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                         placeholder="पुरा नाम"
                       />
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">ईमेल पता</label>
                       <input 
                         required
                         type="email" 
                         className="w-full bg-black border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium"
                         placeholder="email@example.com"
                       />
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">संदेश (Message)</label>
                       <textarea 
                         required
                         rows={4}
                         className="w-full bg-black border border-neutral-800 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-medium resize-none"
                         placeholder="आपकी क्वेरी यहाँ लिखें..."
                       />
                    </div>

                    <div className="pt-4">
                       <button className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-2xl shadow-white/5">
                          संदेश भेजें
                          <Send className="w-5 h-5" />
                       </button>
                    </div>
                 </form>
               ) : (
                 <div className="text-center py-20 relative z-10">
                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                       <MessageSquare className="w-10 h-10" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4">धन्यवाद!</h2>
                    <p className="text-neutral-400 text-lg">आपका संदेश हमें मिल गया है। हम जल्द ही आपसे संपर्क करेंगे।</p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="mt-12 text-sm font-bold text-orange-400"
                    >
                       एक और संदेश भेजें
                    </button>
                 </div>
               )}

               <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                  <Mail className="w-64 h-64" />
               </div>
            </motion.div>
         </div>
      </div>
    </div>
  );
}
