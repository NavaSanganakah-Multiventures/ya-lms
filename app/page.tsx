'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowRight, Sparkles, BookOpen, Clock, Users, ShieldCheck, ChevronRight, PlayCircle, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [msg, setMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json() as any;
      if (res.ok) {
        setStatus('success');
        setMsg('सफलतापूर्वक सब्सक्राइब किया गया!');
        setEmail('');
      } else {
        setStatus('error');
        setMsg(data.error || 'कुछ गलत हो गया।');
      }
    } catch {
      setStatus('error');
      setMsg('नेटवर्क समस्या।');
    }
  };

  return (
    <section className="py-40 px-6 relative">
       <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-5xl md:text-7xl font-black mb-12 leading-none tracking-tighter">सत्यम् शिवम् <br/><span className="text-neutral-500 italic">सुन्दरम्</span></h3>
          <p className="text-neutral-400 text-lg mb-12">हमारे आध्यात्मिक समुदाय में शामिल हों और साप्ताहिक प्रेरणा और ज्ञान प्राप्त करें।</p>
          <form onSubmit={handleSubscribe} className="max-w-xl mx-auto flex flex-col gap-3 relative">
            <div className="flex flex-col sm:flex-row gap-4 p-2 bg-neutral-900 border border-neutral-800 rounded-3xl relative z-10 shadow-2xl">
               <input 
                 type="email" 
                 value={email}
                 onChange={e => setEmail(e.target.value)}
                 required
                 disabled={status === 'loading'}
                 placeholder="अपना ईमेल दर्ज करें" 
                 className="flex-1 bg-transparent px-6 py-4 outline-none text-white placeholder:text-neutral-700 disabled:opacity-50" 
               />
               <button type="submit" disabled={status === 'loading'} className="px-8 py-4 bg-white text-black rounded-2xl font-black hover:bg-neutral-200 transition-all disabled:opacity-50 min-w-[140px] flex justify-center items-center">
                  {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'जुड़ें'}
               </button>
            </div>
            {msg && (
              <p className={`text-sm font-bold absolute -bottom-8 left-0 right-0 ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {msg}
              </p>
            )}
          </form>
       </div>
    </section>
  );
}

export default function LandingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then((data: any) => {
        if (data.courses) setCourses(data.courses.slice(0, 3));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
      {/* Responsive Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter">यज्ञ आश्रम</span>
           </Link>

           {/* Desktop Menu */}
           <div className="hidden md:flex items-center gap-10 text-sm font-bold uppercase tracking-widest text-neutral-400">
              <Link href="/courses" className="hover:text-white transition-colors">पाठ्यक्रम</Link>
              <Link href="/about" className="hover:text-white transition-colors">हमारे बारे में</Link>
              <Link href="/form?slug=admission-form" className="hover:text-white transition-colors">प्रवेश</Link>
              <Link href="/auth/login" className="px-6 py-2.5 bg-white text-black rounded-xl hover:bg-neutral-200 transition-all">लॉगिन</Link>
           </div>

           {/* Mobile Menu Toggle */}
           <button 
             onClick={toggleMobileMenu}
             className="md:hidden p-2 text-neutral-400 hover:text-white"
           >
             {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-neutral-900 border-b border-white/5 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <Link href="/courses" className="block text-xl font-bold py-2">पाठ्यक्रम</Link>
                <Link href="/about" className="block text-xl font-bold py-2">हमारे बारे में</Link>
                <Link href="/form?slug=admission-form" className="block text-xl font-bold py-2">प्रवेश फॉर्म</Link>
                <div className="pt-4 border-t border-white/5">
                  <Link href="/auth/login" className="block w-full text-center py-4 bg-white text-black rounded-2xl font-black text-lg">लॉगिन करें</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Absolute Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden h-full w-full z-0 opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/30 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-orange-900/20 rounded-full blur-[140px]" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
           <motion.div 
             initial={{ opacity: 0, x: -30 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ duration: 0.8 }}
             className="relative z-10"
           >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8">
                 <Sparkles className="w-3 h-3" />
                 विश्व स्तरीय आध्यात्मिक शिक्षा
              </div>
              <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-8 max-w-lg">
                यज्ञ <span className="text-indigo-500">आश्रम</span>
              </h1>
              <p className="text-xl text-neutral-400 mb-10 max-w-md leading-relaxed">
                प्राचीन ज्ञान और आधुनिक तकनीक का संगम। आज ही अपनी आध्यात्मिक यात्रा शुरू करें और स्वयं को जानें।
              </p>
              
              <div className="flex flex-wrap gap-4">
                 <Link href="/auth/login" className="px-8 py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-neutral-200 transition-all flex items-center gap-3">
                   सीखना शुरू करें
                   <ArrowRight className="w-5 h-5" />
                 </Link>
                 <Link href="/form?slug=admission-form" className="px-8 py-4 bg-neutral-900 text-white border border-neutral-800 rounded-2xl font-bold text-lg hover:bg-neutral-800 transition-all flex items-center gap-3">
                   प्रवेश फॉर्म
                 </Link>
              </div>

              <div className="mt-16 flex items-center gap-8">
                 <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                         {i}
                      </div>
                    ))}
                 </div>
                 <div>
                    <p className="text-sm font-bold">5000+ छात्र</p>
                    <p className="text-xs text-neutral-500">संतुष्ट और उन्नत जीवन</p>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1 }}
             className="relative aspect-square lg:aspect-video rounded-[40px] overflow-hidden group shadow-2xl bg-neutral-800 flex items-center justify-center"
           >
              <BookOpen className="w-20 h-20 text-neutral-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <button className="absolute inset-0 m-auto w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-all group/btn">
                 <PlayCircle className="w-10 h-10 text-white fill-white group-hover/btn:fill-indigo-500 transition-all" />
              </button>
           </motion.div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-32 px-6 bg-neutral-950/50 relative border-y border-neutral-900">
         <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
               <div className="max-w-xl">
                  <h2 className="text-4xl md:text-5xl font-black mb-6">लोकप्रिय पाठ्यक्रम</h2>
                  <p className="text-neutral-500 text-lg">अनुभवी गुरुओं द्वारा तैयार किए गए पाठ्यक्रम जो आपके जीवन को सकारात्मक रूप से बदल देंगे।</p>
               </div>
               <Link href="/auth/login" className="text-indigo-400 font-bold flex items-center gap-2 hover:text-white transition-colors group">
                  सभी पाठ्यक्रम देखें
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
               </Link>
            </div>

            {isLoading ? (
               <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : (
              <div className="grid md:grid-cols-3 gap-8">
                {courses.map(course => (
                  <motion.div 
                    key={course.id}
                    whileHover={{ y: -10 }}
                    className="bg-neutral-900/50 border border-neutral-800 rounded-[32px] p-8 hover:border-indigo-500/30 transition-all group"
                  >
                      <div className="aspect-video bg-neutral-950 rounded-2xl mb-8 overflow-hidden relative flex items-center justify-center">
                         <div className="text-neutral-700 font-black text-4xl">{course.title.charAt(0)}</div>
                         <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest text-white border border-white/10">
                            {course.category_name || 'General'}
                         </div>
                      </div>
                     <h3 className="text-2xl font-bold mb-3 line-clamp-1">{course.title}</h3>
                     <p className="text-neutral-500 text-sm mb-8 line-clamp-2 h-10">{course.description}</p>
                     
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-400">
                           <span className="text-2xl font-black">${(course.price / 100).toFixed(0)}</span>
                        </div>
                        <Link href="/auth/login" className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-neutral-200 transition-all">
                           <ArrowRight className="w-5 h-5" />
                        </Link>
                     </div>
                  </motion.div>
                ))}
              </div>
            )}
         </div>
      </section>

      {/* Dynamic Form Features (Promotional) */}
      <section className="py-32 px-6 relative overflow-hidden">
         <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1">
               <span className="text-orange-500 text-[10px] font-black tracking-widest border border-orange-500/30 px-3 py-1 rounded-full mb-6 inline-block">TECH POWER</span>
               <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">स्मार्ट एडमिशन और <br/><span className="text-orange-500 underline decoration-2 underline-offset-8">AI आधारित</span> मूल्यांकन</h2>
               <p className="text-neutral-400 text-lg mb-10 leading-relaxed">
                 हमारा प्लेटफार्म केवल वीडियो नहीं देता, बल्कि AI की सहायता से आपके प्रवेश आवेदन का विश्लेषण करता है। आपको तुरंत फीडबैक मिलता है कि आप किस कोर्स के लिए सबसे उपयुक्त हैं।
               </p>
               <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                     <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                     </div>
                     <div>
                        <h4 className="font-bold text-white mb-1">सुरक्षित और पारदर्शी</h4>
                        <p className="text-neutral-500 text-xs">आपका डेटा आधुनिक एन्क्रिप्शन के साथ सुरक्षित है।</p>
                     </div>
                  </div>
                  <div className="flex gap-4 items-start">
                     <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-orange-500" />
                     </div>
                     <div>
                        <h4 className="font-bold text-white mb-1">AI मार्गदर्शक</h4>
                        <p className="text-neutral-500 text-xs">कोर्स के दौरान AI गुरु आपको हर कदम पर गाइड करेंगे।</p>
                     </div>
                  </div>
               </div>
               
               <div className="mt-12">
                  <Link href="/form?slug=admission-form" className="px-10 py-5 bg-white text-black rounded-2xl font-black text-xl hover:bg-neutral-200 transition-all shadow-2xl shadow-white/10">
                     अभी आवेदन करें (Apply Now)
                  </Link>
               </div>
            </div>

            <div className="flex-1 relative w-full lg:max-w-md h-[500px] group">
               <div className="absolute inset-0 border-[20px] border-neutral-900 rounded-[60px] transform rotate-3 scale-95 group-hover:rotate-0 group-hover:scale-100 transition-all duration-700" />
               <div className="absolute inset-0 bg-neutral-900 rounded-[50px] overflow-hidden transform group-hover:translate-x-4 group-hover:-translate-y-4 transition-all duration-700 flex items-center justify-center">
                  <div className="text-neutral-700 font-black text-6xl">विद्या</div>
                  <div className="absolute top-10 left-10 p-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-3xl w-48">
                     <p className="text-[10px] font-black text-indigo-400 mb-2 uppercase">Status</p>
                     <p className="text-sm font-bold text-white mb-4">आवेदन स्वीकृत</p>
                     <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-3/4 bg-green-500" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Testimonials or Stats */}
      <section className="py-20 px-6 bg-neutral-900/40 relative">
         <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
               <p className="text-6xl font-black mb-2 leading-none">50+</p>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">विशेषज्ञ गुरु</p>
            </div>
            <div>
               <p className="text-6xl font-black mb-2 leading-none">12M</p>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">मिनट अध्ययन</p>
            </div>
            <div>
               <p className="text-6xl font-black mb-2 leading-none">4.9</p>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">औसत रेटिंग</p>
            </div>
            <div>
               <p className="text-6xl font-black mb-2 leading-none">100%</p>
               <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">आध्यात्मिक संतुष्टि</p>
            </div>
         </div>
      </section>

      {/* Global Newsletter/CTA */}
      <NewsletterForm />

      <footer className="py-20 px-6 border-t border-neutral-900 relative z-10 bg-black">
         <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-2">
               <h4 className="text-2xl font-black mb-8">यज्ञ आश्रम</h4>
               <p className="text-neutral-500 max-w-sm leading-relaxed mb-8">
                  यज्ञ आश्रम आध्यात्मिक जागृति और वैदिक ज्ञान का एक वैश्विक केंद्र है। हम तकनीक का उपयोग करके प्राचीन ज्ञान को सभी के लिए सुलभ बनाते हैं।
               </p>
            </div>
            <div>
               <h5 className="font-bold mb-8 text-white uppercase tracking-widest text-[10px]">संसाधन</h5>
               <ul className="space-y-4 text-neutral-500 text-sm font-medium">
                  <li><Link href="/about" className="hover:text-white transition-colors">हमारे बारे में (About)</Link></li>
                  <li><Link href="/courses" className="hover:text-white transition-colors">पाठ्यक्रम (Courses)</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors">संपर्क करें (Contact)</Link></li>
                  <li><Link href="/form?slug=admission-form" className="hover:text-white transition-colors">प्रवेश (Admission)</Link></li>
               </ul>
            </div>
            <div>
               <h5 className="font-bold mb-8 text-white uppercase tracking-widest text-[10px]">संसाधन</h5>
               <ul className="space-y-4 text-neutral-500 text-sm font-medium">
                  <li><Link href="/legal-docs?slug=privacy" className="hover:text-white transition-colors">गोपनीयता नीति</Link></li>
                  <li><Link href="/legal-docs?slug=terms" className="hover:text-white transition-colors">सेवा की शर्तें</Link></li>
                  <li><Link href="/legal-docs?slug=refund" className="hover:text-white transition-colors">रिफंड पॉलिसी</Link></li>
               </ul>
            </div>
         </div>
         <div className="pt-10 border-t border-neutral-900 flex justify-between items-center">
            <p className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest">
               &copy; {new Date().getFullYear()} YAGYA ASHRAM • ENLIGHTENING THE WORLD
            </p>
            {/* Social Icons Placeholder */}
            <div className="flex gap-4">
               <div className="w-4 h-4 bg-neutral-900 hover:bg-neutral-800 rounded-full" />
               <div className="w-4 h-4 bg-neutral-900 hover:bg-neutral-800 rounded-full" />
               <div className="w-4 h-4 bg-neutral-900 hover:bg-neutral-800 rounded-full" />
            </div>
         </div>
      </footer>
    </div>
  );
}
