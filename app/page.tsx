'use client';

import { useEffect, useState } from 'react';
import { 
  Loader2, ArrowRight, Sparkles, BookOpen, Clock, Users, User,
  ShieldCheck, ChevronRight, PlayCircle, Menu, X, Globe, 
  Zap, Brain, Video, GraduationCap, Github, Twitter, Facebook, MapPin, LogIn
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
      .then((data: any) => setSettings(data.settings || {}))
      .catch(err => console.error('Settings fetch failed:', err));

    // Fetch Courses
    fetch('/api/courses')
      .then(res => res.json())
      .then((data: any) => {
        if (data.courses) setCourses(data.courses.slice(0, 3));
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Courses fetch failed:', err);
        setIsLoading(false);
      });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const siteName = settings.site_name || 'Adityanveshan';
  const dashboardName = settings.dashboard_name || 'Swadhyaya Vedika';
  const childCompany = settings.child_company || 'Yagya Ashram';

  const features = [
    { 
      title: language === 'en' ? 'AI Personal Teacher' : 'AI व्यक्तिगत शिक्षक', 
      desc: language === 'en' ? 'Learn with an AI that understands your pace.' : 'अपनी गति से समझने वाली AI के साथ सीखें।',
      icon: Brain, color: 'from-purple-500/20 to-indigo-500/20', border: 'border-purple-500/30'
    },
    { 
      title: language === 'en' ? 'Live Interactive Classes' : 'लाइव इंटरएक्टिव क्लासेस', 
      desc: language === 'en' ? 'Real-time learning with advanced whiteboard sync.' : 'एडवांस्ड व्हाइटबोर्ड सिंक के साथ वास्तविक समय में सीखें।',
      icon: Video, color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30'
    },
    { 
      title: language === 'en' ? 'Global Certifications' : 'वैश्विक प्रमाणपत्र', 
      desc: language === 'en' ? 'Verified blockchain-backed spiritual credentials.' : 'सत्यापित ब्लॉकचेन-आधारित आध्यात्मिक प्रमाणपत्र।',
      icon: GraduationCap, color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30'
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500/30 font-sans overflow-x-hidden">
      
      {/* Premium Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4 bg-black/80 backdrop-blur-2xl border-b border-white/5' : 'py-6 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
           <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center border border-white/10">
                  <Image src="/icon.png" alt="Logo" width={24} height={24} className="brightness-200" />
                </div>
              </div>
              <div className="flex flex-col -space-y-1">
                <span className="font-black text-xl tracking-tighter uppercase">{siteName}</span>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">{dashboardName}</span>
              </div>
           </Link>

           <div className="hidden md:flex items-center gap-10 text-[11px] font-black uppercase tracking-widest text-neutral-400">
              <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
               <Link href="/about" className="hover:text-white transition-colors">About</Link>
               <Link href="/legal-docs?slug=privacy" className="hover:text-white transition-colors">Privacy</Link>
               <LanguageSwitcher />
              <Link href="/auth/login" className="px-6 py-2.5 bg-white text-black rounded-full hover:bg-orange-500 hover:text-white transition-all shadow-xl shadow-white/5">
                Portal Login
              </Link>
           </div>

           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2">
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-[72px] bg-black/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl z-[99] md:hidden"
          >
            <nav className="px-6 py-8 space-y-2 max-h-[70dvh] overflow-y-auto">
              <Link 
                href="/courses" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 font-bold"
              >
                <BookOpen className="w-5 h-5 text-orange-400" />
                {language === 'en' ? 'Courses' : 'पाठ्यक्रम'}
              </Link>
              <Link 
                href="/about" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 font-bold"
              >
                <User className="w-5 h-5 text-orange-400" />
                {language === 'en' ? 'About' : 'हमारे बारे में'}
              </Link>
              <Link 
                href="/contact" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 font-bold"
              >
                <MapPin className="w-5 h-5 text-orange-400" />
                {language === 'en' ? 'Contact' : 'संपर्क'}
              </Link>
              <Link 
                href="/legal-docs?slug=privacy" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl text-neutral-300 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 font-bold"
              >
                <ShieldCheck className="w-5 h-5 text-orange-400" />
                {language === 'en' ? 'Privacy Policy' : 'गोपनीयता नीति'}
              </Link>
              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="px-4 mb-4">
                  <LanguageSwitcher />
                </div>
                <Link 
                  href="/auth/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl bg-orange-600 text-white hover:bg-orange-500 transition-all font-bold"
                >
                  <LogIn className="w-5 h-5" />
                  {language === 'en' ? 'Portal Login' : 'पोर्टल लॉगिन'}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section - The WOW Moment */}
      <section className="relative min-h-screen flex items-center pt-20 px-6 overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '256px 256px' }} />
        </div>

        <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-8">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">
                {language === 'en' ? 'Redefining Spiritual Education' : 'आध्यात्मिक शिक्षा का नया स्वरूप'}
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-9xl font-black leading-[0.85] tracking-tighter mb-8 italic">
              {siteName.split(' ')[0]} <br/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 not-italic">
                {siteName.split(' ')[1] || 'Academy'}
              </span>
            </h1>
            
              <p className="text-lg md:text-xl text-neutral-400 mb-6 max-w-lg leading-relaxed font-medium">
                {language === 'en' 
                  ? `${siteName} is an advanced online Learning Management System (LMS) offering live Vedic classes, AI-powered tutoring, spiritual courses, and globally recognized certifications — blending ancient wisdom with modern technology.`
                  : `${siteName} एक उन्नत ऑनलाइन लर्निंग मैनेजमेंट सिस्टम (LMS) है जो लाइव वैदिक कक्षाएं, AI-आधारित ट्यूशन, आध्यात्मिक पाठ्यक्रम और वैश्विक प्रमाणपत्र प्रदान करता है — प्राचीन ज्ञान और आधुनिक तकनीक का संगम।`}
              </p>

              <div className="flex flex-wrap gap-6">
                <Link href="/auth/login" className="px-10 py-5 bg-orange-600 text-white rounded-2xl font-black text-lg hover:bg-orange-500 hover:scale-105 transition-all shadow-2xl shadow-orange-600/20 flex items-center gap-3">
                  {language === 'en' ? 'Start Journey' : 'यात्रा शुरू करें'}
                  <ArrowRight />
                </Link>
                <Link href="/courses" className="px-10 py-5 bg-white/5 border border-white/10 backdrop-blur-md text-white rounded-2xl font-black text-lg hover:bg-white/10 transition-all flex items-center gap-3">
                  {language === 'en' ? 'Explore Courses' : 'कोर्स देखें'}
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-[11px] font-bold text-neutral-500">
                <Link href="/legal-docs?slug=privacy" className="flex items-center gap-1.5 hover:text-orange-400 transition-colors underline underline-offset-4 decoration-neutral-700 hover:decoration-orange-500">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Privacy Policy' : 'गोपनीयता नीति'}
                </Link>
                <span className="text-neutral-800">|</span>
                <span>{language === 'en' ? 'Secure & Encrypted' : 'सुरक्षित और एन्क्रिप्टेड'}</span>
              </div>
          </motion.div>

          {/* Interactive Visual Element */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative lg:pl-10"
          >
            <div className="absolute inset-0 bg-orange-500 blur-[100px] opacity-10 rounded-full animate-pulse" />
            <div className="relative aspect-square max-w-[500px] mx-auto rounded-[60px] border border-white/10 bg-neutral-900/40 backdrop-blur-3xl overflow-hidden p-8 flex items-center justify-center group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="w-full h-full border border-dashed border-white/5 rounded-full"
              />
              <div className="absolute text-center space-y-4">
                <div className="w-24 h-24 mx-auto bg-orange-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-700">
                  <Zap className="w-10 h-10 text-white fill-white" />
                </div>
                <div className="px-6 py-2 bg-black/40 border border-white/10 rounded-full">
                  <span className="text-xs font-black uppercase tracking-widest">Digital Sangha</span>
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
              We&apos;ve integrated AI and WebRTC technology to bring you an unmatched spiritual learning experience.
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
                {language === 'en' ? 'Master Your Life' : 'जीवन के स्वामी बनें'}
              </h2>
              <p className="text-neutral-500 text-lg">Curated programs for the modern seeker.</p>
            </div>
            <Link href="/courses" className="px-8 py-3 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              View Academy
            </Link>
          </div>

          {isLoading ? (
             <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-10">
              {courses.map(course => (
                <div key={course.id} className="group cursor-pointer">
                  <div className="aspect-[4/5] bg-neutral-900 rounded-[50px] mb-8 overflow-hidden relative border border-white/5 transition-all duration-700 group-hover:rounded-[20px]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                      <span className="text-8xl font-black text-white/5 italic">{course.title?.charAt(0) || '?'}</span>
                    </div>
                    <div className="absolute bottom-8 left-8 right-8 z-20">
                      <div className="px-3 py-1 bg-orange-600 rounded-full inline-block text-[10px] font-black uppercase tracking-widest mb-4">
                        {course.category_name || 'Enlightenment'}
                      </div>
                      <h4 className="text-3xl font-black mb-2 line-clamp-1 group-hover:text-orange-400 transition-colors">{course.title}</h4>
                      <p className="text-sm text-neutral-400 line-clamp-2 mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        {course.description}
                      </p>
                      <div className="flex items-center justify-between">
                         <span className="text-xl font-black">₹{course.price_rupees || '0'}</span>
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
                   <h3 className="text-4xl font-black mb-2">{settings.founder_name || 'Acharya Tripathi'}</h3>
                   <p className="text-orange-500 font-black text-sm uppercase tracking-widest mb-8">Spiritual Visionary</p>
                   <Link href={settings.founder_google_panel || '#'} className="px-6 py-2 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                      Knowledge Panel
                   </Link>
                </div>
             </div>
             {/* Floating Badge */}
             <div className="absolute -bottom-10 -right-10 p-10 bg-orange-600 rounded-[40px] shadow-2xl hidden lg:block">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2">Message</p>
                <p className="text-xl font-bold leading-tight">&quot;Truth is one, <br/> Paths are many.&quot;</p>
             </div>
          </div>
          <div className="lg:w-1/2">
             <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-10 leading-[0.9]">
               The Vision <br/> Behind <span className="text-orange-500">The Light</span>
             </h2>
             <div className="space-y-12">
               <div className="flex gap-8">
                 <div className="text-5xl font-black text-neutral-800">01</div>
                 <div>
                   <h4 className="text-2xl font-black mb-3">Ancient Roots</h4>
                   <p className="text-neutral-500 leading-relaxed">Derived from the purest forms of Vedic knowledge, passed down through generations.</p>
                 </div>
               </div>
               <div className="flex gap-8">
                 <div className="text-5xl font-black text-neutral-800">02</div>
                 <div>
                   <h4 className="text-2xl font-black mb-3">Modern Access</h4>
                   <p className="text-neutral-500 leading-relaxed">Available anywhere, anytime, through our state-of-the-art digital infrastructure.</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Unique Design Feature: Fast Grid */}
      <section className="py-20 bg-orange-600">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex animate-marquee gap-20 whitespace-nowrap">
            {[1,2,3,4,5].map(i => (
              <span key={i} className="text-[100px] font-black text-white/10 uppercase tracking-tighter">
                • {siteName} • {childCompany} • ADVANCED LMS • SPIRITUAL TECH • 
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="py-32 px-6 bg-[#050505] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                   <Image src="/icon.png" alt="Logo" width={24} height={24} className="brightness-200" />
                </div>
                <span className="font-black text-2xl tracking-tighter uppercase">{siteName}</span>
              </Link>
              <p className="text-neutral-500 text-lg leading-relaxed max-w-sm mb-6">
                Empowering humanity through spiritual intelligence and technological excellence. A {settings.parent_company || 'NavaSanganakah'} initiative.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                  <p className="text-sm text-neutral-400 font-medium leading-relaxed">
                    {settings.site_address || 'Rajgarh, MP, India'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                  <p className="text-sm text-neutral-400 font-bold">
                    {settings.contact_phone || '+919669509960'}
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <Link href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-orange-600 transition-all">
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-orange-600 transition-all">
                  <Facebook className="w-5 h-5" />
                </Link>
                <Link href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-orange-600 transition-all">
                  <Github className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-10">Navigation</h5>
               <ul className="space-y-6 text-neutral-400 font-bold text-sm">
                 <li><Link href="/courses" className="hover:text-white transition-all underline-offset-4 hover:underline">Explore Academy</Link></li>
                 <li><Link href="/about" className="hover:text-white transition-all underline-offset-4 hover:underline">Our Vision</Link></li>
                 <li><Link href="/contact" className="hover:text-white transition-all underline-offset-4 hover:underline">Support Center</Link></li>
                 <li><Link href="/auth/login" className="hover:text-white transition-all underline-offset-4 hover:underline">Student Portal</Link></li>
               </ul>
            </div>
            <div>
               <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-10">Legals</h5>
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
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
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
