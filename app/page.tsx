'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, ArrowRight, Sparkles, BookOpen, Clock, Users, User,
  ShieldCheck, ChevronRight, PlayCircle, Menu, X, Globe, 
  Zap, Brain, Video, GraduationCap, Github, Twitter, Facebook, MapPin
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Fetch Settings
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: any) => setSettings(data.settings || {}));

    // Fetch Courses
    fetch('/api/courses')
      .then(res => res.json())
      .then((data: any) => {
        if (data.courses) setCourses(data.courses.slice(0, 3));
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const siteName = settings.site_name || 'NS LMS';
  const dashboardName = settings.dashboard_name || 'NS LMS Portal';
  const childCompany = settings.child_company || 'NavaSanganakah LMS';

  const features = [
    { 
      title: language === 'en' ? 'Aarya: Your AI Tutor' : 'आर्या: आपका AI शिक्षक',
      desc: language === 'en' ? 'Master complex science & math concepts with personalized AI guidance.' : 'व्यक्तिगत AI मार्गदर्शन के साथ जटिल विज्ञान और गणित अवधारणाओं में महारत हासिल करें।',
      icon: Brain, color: 'from-accent-gold/10 to-accent-gold-dark/10', border: 'border-accent-gold/30'
    },
    { 
      title: language === 'en' ? 'Deep Study Modules' : 'गहन अध्ययन मॉड्यूल',
      desc: language === 'en' ? 'Detailed courses for 10th & 12th Biology, Chemistry, and Mathematics.' : '10वीं और 12वीं जीव विज्ञान, रसायन विज्ञान और गणित के लिए विस्तृत पाठ्यक्रम।',
      icon: BookOpen, color: 'from-blue-500/10 to-navy-500/10', border: 'border-blue-500/30'
    },
    { 
      title: language === 'en' ? 'Exam Readiness' : 'परीक्षा की तैयारी',
      desc: language === 'en' ? 'Real-time mock exams and performance tracking to ace your boards.' : 'अपने बोर्ड परीक्षाओं में सफल होने के लिए रीयल-टाइम मॉक परीक्षा और प्रदर्शन ट्रैकिंग।',
      icon: ShieldCheck, color: 'from-accent-gold/10 to-accent-gold-dark/10', border: 'border-accent-gold/30'
    }
  ];

  return (
    <div className="min-h-screen bg-[#000b1e] text-white selection:bg-accent-gold/30 font-sans overflow-x-hidden">
      
      {/* Premium Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4 bg-[#000b1e]/80 backdrop-blur-2xl border-b border-white/5' : 'py-6 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
           <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-accent-gold blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-[#a67c37] to-[#c5a059] rounded-xl flex items-center justify-center border border-white/10">
                  <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
                </div>
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="font-black text-xl tracking-tighter uppercase">{siteName}</span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">{dashboardName}</span>
              </div>
           </Link>

           <div className="hidden md:flex items-center gap-10 text-[11px] font-black uppercase tracking-widest text-neutral-400">
              <Link href="/courses" className="hover:text-accent-gold transition-colors">Courses</Link>
              <Link href="/about" className="hover:text-accent-gold transition-colors">About</Link>
              <LanguageSwitcher />
              <Link href="/auth/login" className="px-6 py-2.5 bg-[#c5a059] text-white rounded-full hover:bg-[#e2c28a] transition-all shadow-xl shadow-accent-gold/5">
                Portal Login
              </Link>
           </div>

           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2">
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
      </nav>

      {/* Hero Section - The WOW Moment */}
      <section className="relative min-h-screen flex items-center pt-20 px-6 overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-accent-gold/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay" />
        </div>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-8">
              <Sparkles className="w-3.5 h-3.5 text-accent-gold" />
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold-light">
                {language === 'en' ? 'Redefining Academic Excellence' : 'शैक्षणिक उत्कृष्टता का नया स्वरूप'}
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-9xl font-black leading-[0.85] tracking-tighter mb-8 italic">
              {siteName.split(' ')[0]} <br/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] to-[#a67c37] not-italic">
                {siteName.split(' ')[1] || 'LMS'}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-lg leading-relaxed font-medium">
              {language === 'en' 
                ? `Modern education meets deep conceptual study. Experience the future of 10th & 12th board preparation at ${childCompany}.`
                : `आधुनिक शिक्षा और गहन वैचारिक अध्ययन का संगम। ${childCompany} में 10वीं और 12वीं बोर्ड की तैयारी के भविष्य का अनुभव करें।`}
            </p>

            <div className="flex flex-wrap gap-6">
              <Link href="/auth/login" className="px-10 py-5 bg-[#c5a059] text-white rounded-2xl font-black text-lg hover:bg-[#a67c37] hover:scale-105 transition-all shadow-2xl shadow-accent-gold/20 flex items-center gap-3">
                {language === 'en' ? 'Start Learning' : 'पढ़ना शुरू करें'}
                <ArrowRight />
              </Link>
              <Link href="/courses" className="px-10 py-5 bg-white/5 border border-white/10 backdrop-blur-md text-white rounded-2xl font-black text-lg hover:bg-white/10 transition-all flex items-center gap-3">
                {language === 'en' ? 'Explore Courses' : 'कोर्स देखें'}
              </Link>
            </div>
          </motion.div>

          {/* Interactive Visual Element */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative lg:pl-10"
          >
            <div className="absolute inset-0 bg-accent-gold blur-[100px] opacity-10 rounded-full animate-pulse" />
            <div className="relative aspect-square max-w-[500px] mx-auto rounded-[60px] border border-white/10 bg-neutral-900/40 backdrop-blur-3xl overflow-hidden p-8 flex items-center justify-center group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/10 to-transparent" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="w-full h-full border border-dashed border-white/5 rounded-full"
              />
              <div className="absolute text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-[#a67c37] rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-700">
                  <Zap className="w-10 h-10 text-white fill-white" />
                </div>
                <div className="px-6 py-2 bg-black/40 border border-white/10 rounded-full">
                  <span className="text-xs font-black uppercase tracking-widest">Modern Study</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="py-40 px-6 relative border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-none">
              {language === 'en' ? 'Smart Learning Ecosystem' : 'स्मार्ट लर्निंग इकोसिस्टम'}
            </h2>
            <p className="text-neutral-500 text-lg font-medium">
              We&apos;ve integrated AI and WebRTC technology to bring you an unmatched academic learning experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -15 }}
                className={`p-10 rounded-[40px] bg-gradient-to-br ${f.color} border ${f.border} backdrop-blur-xl group transition-all duration-500`}
              >
                <div className="w-16 h-16 bg-black/40 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform">
                  <f.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black mb-4">{f.title}</h3>
                <p className="text-neutral-400 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses Redesigned */}
      <section className="py-40 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div className="max-w-xl">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-none">
                {language === 'en' ? 'Master Your Subjects' : 'अपने विषयों में महारत हासिल करें'}
              </h2>
              <p className="text-neutral-500 text-lg">Curated programs for 10th & 12th board students.</p>
            </div>
            <Link href="/courses" className="px-8 py-3 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              View Academy
            </Link>
          </div>

          {isLoading ? (
             <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent-gold" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-10">
              {courses.map(course => (
                <div key={course.id} className="group cursor-pointer">
                  <div className="aspect-[4/5] bg-neutral-900 rounded-[50px] mb-8 overflow-hidden relative border border-white/5 transition-all duration-700 group-hover:rounded-[20px]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                      <span className="text-8xl font-black text-white/5 italic">{course.title.charAt(0)}</span>
                    </div>
                    <div className="absolute bottom-8 left-8 right-8 z-20">
                      <div className="px-3 py-1 bg-[#a67c37] rounded-full inline-block text-[10px] font-black uppercase tracking-widest mb-4">
                        {course.category_name || 'Science'}
                      </div>
                      <h4 className="text-3xl font-black mb-2 line-clamp-1 group-hover:text-accent-gold transition-colors">{course.title}</h4>
                      <p className="text-sm text-neutral-400 line-clamp-2 mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        {course.description}
                      </p>
                      <div className="flex items-center justify-between">
                         <span className="text-xl font-black">₹{course.price_inr || course.price}</span>
                         <Link href="/auth/login" className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center transform translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
                           <ArrowRight className="w-5 h-5" />
                         </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Founder Spotlight */}
      <section className="py-40 px-6 relative overflow-hidden bg-neutral-950">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="lg:w-1/2 relative">
             <div className="aspect-[4/5] rounded-[60px] bg-neutral-900 border border-white/10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                   <div className="w-24 h-24 bg-neutral-800 rounded-full mb-6 flex items-center justify-center border border-white/10">
                      <User className="w-10 h-10 text-neutral-600" />
                   </div>
                   <h3 className="text-4xl font-black mb-2">{settings.founder_name || 'Director Navasanganakah'}</h3>
                   <p className="text-accent-gold font-black text-sm uppercase tracking-widest mb-8">Academic Visionary</p>
                   <Link href={settings.founder_google_panel || '#'} className="px-6 py-2 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                      Knowledge Panel
                   </Link>
                </div>
             </div>
             {/* Floating Badge */}
             <div className="absolute -bottom-10 -right-10 p-10 bg-[#a67c37] rounded-[40px] shadow-2xl hidden lg:block">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Message</p>
                <p className="text-xl font-bold leading-tight">&quot;Knowledge is Power, <br/> Excellence is Goal.&quot;</p>
             </div>
          </div>
          <div className="lg:w-1/2">
             <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-10 leading-[0.9]">
               The Vision <br/> Behind <span className="text-accent-gold">NS LMS</span>
             </h2>
             <div className="space-y-12">
               <div className="flex gap-8">
                 <div className="text-5xl font-black text-neutral-800">01</div>
                 <div>
                   <h4 className="text-2xl font-black mb-3">Deep Study</h4>
                   <p className="text-neutral-500 leading-relaxed">Specialized focus on 10th & 12th science and math for comprehensive understanding.</p>
                 </div>
               </div>
               <div className="flex gap-8">
                 <div className="text-5xl font-black text-neutral-800">02</div>
                 <div>
                   <h4 className="text-2xl font-black mb-3">Modern Study</h4>
                   <p className="text-neutral-500 leading-relaxed">Leveraging AI to provide personalized tutoring that adapts to each student's needs.</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Unique Design Feature: Fast Grid */}
      <section className="py-20 bg-[#a67c37]">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex animate-marquee gap-20 whitespace-nowrap">
            {[1,2,3,4,5].map(i => (
              <span key={i} className="text-[100px] font-black text-white/10 uppercase tracking-tighter">
                • {siteName} • {childCompany} • MODERN LMS • SCIENCE & MATH •
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="py-32 px-6 bg-[#000b1e] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-[#a67c37] rounded-xl flex items-center justify-center">
                   <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
                </div>
                <span className="font-black text-2xl tracking-tighter uppercase">{siteName}</span>
              </Link>
              <p className="text-neutral-400 text-lg leading-relaxed max-w-sm mb-6">
                Empowering students through academic intelligence and technological excellence. A {settings.parent_company || 'NavaSanganakah'} initiative.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-accent-gold mt-1 shrink-0" />
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">
                    {settings.site_address || 'Rajgarh, MP, India'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-accent-gold shrink-0" />
                  <p className="text-sm text-neutral-400 font-bold">
                    {settings.contact_phone || '+919669509960'}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <Link href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#c5a059] transition-all">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#c5a059] transition-all">
                  <Facebook className="w-5 h-5" />
                </Link>
                <Link href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-[#c5a059] transition-all">
                  <Github className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-gold mb-10">Navigation</h5>
               <ul className="space-y-6 text-neutral-400 font-bold text-sm">
                 <li><Link href="/courses" className="hover:text-white transition-all underline-offset-4 hover:underline">Explore Academy</Link></li>
                 <li><Link href="/about" className="hover:text-white transition-all underline-offset-4 hover:underline">Our Vision</Link></li>
                 <li><Link href="/contact" className="hover:text-white transition-all underline-offset-4 hover:underline">Support Center</Link></li>
                 <li><Link href="/auth/login" className="hover:text-white transition-all underline-offset-4 hover:underline">Student Portal</Link></li>
               </ul>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-gold mb-10">Legals</h5>
               <ul className="space-y-6 text-neutral-400 font-bold text-sm">
                 <li><Link href="/legal-docs?slug=privacy" className="hover:text-white transition-all">Privacy Policy</Link></li>
                 <li><Link href="/legal-docs?slug=terms" className="hover:text-white transition-all">Terms of Service</Link></li>
                 <li><Link href="/legal-docs?slug=refund" className="hover:text-white transition-all">Refunds</Link></li>
               </ul>
            </div>
          </div>
          
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
             <p className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.3em]">
               &copy; {new Date().getFullYear()} {siteName} • DESIGNED BY NAVASANGANAKAH
             </p>
             <div className="flex items-center gap-2 px-4 py-1 bg-white/5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">System Online (V4.2)</span>
             </div>
          </div>
        </div>
      </footer>

      {/* Smooth Marquee Keyframes */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
