'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Loader2, ArrowRight, BookOpen, Clock, Users, 
  Search, Filter, ChevronRight, GraduationCap, 
  Sparkles, Star, Zap, Globe, Bookmark, Coins
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CoursesPage() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then((data: any) => {
        if (data.courses) {
          setCourses(data.courses);
          const cats = ['All', ...new Set(data.courses.map((c: any) => c.category_name).filter(Boolean) as string[])];
          setCategories(cats);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // ⚡ Bolt Optimization: Hoisted searchQuery.toLowerCase() outside the filter loop to prevent O(N) string allocations
  const filteredCourses = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return courses.filter(c => {
      const localizedTitle = language === 'hi' ? c.title_hi || c.title : c.title;
      const localizedDescription = language === 'hi' ? c.description_hi || c.description : c.description;
      const matchesSearch = localizedTitle.toLowerCase().includes(searchLower) ||
                           (localizedDescription && localizedDescription.toLowerCase().includes(searchLower));
      const matchesCategory = selectedCategory === 'All' || c.category_name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, selectedCategory, language]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500/30 font-sans">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full mb-6"
            >
              <GraduationCap className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">
                {language === 'en' ? 'Knowledge Catalog' : 'ज्ञान सूची'}
              </span>
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] mb-6">
              {language === 'en' ? 'Unlock Your' : 'खोलें अपना'} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-700">
                {language === 'en' ? 'Divine Potential' : 'दिव्य सामर्थ्य'}
              </span>
            </h1>
            <p className="text-neutral-400 text-lg font-medium max-w-lg">
              {language === 'en' 
                ? 'Explore our curated selection of Vedic sciences, traditional arts, and modern wisdom.' 
                : 'वैदिक विज्ञान, पारंपरिक कला और आधुनिक ज्ञान के हमारे चुनिंदा संग्रह का अन्वेषण करें।'}
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative group flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-orange-500 transition-colors" />
              <input 
                type="text"
                placeholder={language === 'en' ? "Search courses..." : "कोर्स खोजें..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all backdrop-blur-md"
              />
            </div>
          </div>
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-3 overflow-x-auto pb-8 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border shrink-0 ${
                selectedCategory === cat 
                ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' 
                : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
              }`}
            >
              {cat === 'All' ? (language === 'en' ? 'All Modules' : 'सभी मॉड्यूल') : cat}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            <p className="text-neutral-500 font-bold tracking-widest uppercase text-[10px]">Loading Wisdom...</p>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-purple-600/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full bg-neutral-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden flex flex-col hover:border-orange-500/30 transition-all duration-500 hover:-translate-y-2">
                  
                  {/* Card Header (Image/Category) */}
                  <div className="relative h-48 overflow-hidden">
                    <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
                    <Image 
                      src={course.thumbnail_url || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'}
                      alt={language === 'hi' ? course.title_hi || course.title : course.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-400">
                        {course.category_name || 'General'}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      {Number(course.self_study_enabled || 0) === 1 && (
                        <span className="px-3 py-1 bg-violet-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-violet-500/20">
                          <Coins className="w-3 h-3" />
                          {Number(course.wallet_rupees || 0) > 0 ? `₹${course.wallet_rupees}` : 'Credits'}
                        </span>
                      )}
                      {course.price_rupees === 0 && (
                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                          <Zap className="w-3 h-3 fill-white" />
                          FREE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex text-orange-500">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500">(4.9/5.0)</span>
                    </div>

                    <h3 className="text-xl font-black mb-3 group-hover:text-orange-400 transition-colors leading-tight">
                      {language === 'hi' ? course.title_hi || course.title : course.title}
                    </h3>
                    
                    <p className="text-neutral-400 text-sm font-medium line-clamp-2 mb-6 flex-1">
                      {(language === 'hi' ? course.description_hi || course.description : course.description) || 'Dive deep into traditional Vedic knowledge and modern application.'}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tighter">12 Modules</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-tighter">Lifetime</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Investment</span>
                        <span className="text-xl font-black text-white">
                          {course.price_rupees > 0 ? `₹${course.price_rupees.toLocaleString()}` : 'Scholarship'}
                        </span>
                      </div>
                      <Link 
                        href={`/course?id=${course.id}`}
                        className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all group/btn shadow-xl shadow-white/5 hover:shadow-orange-500/20"
                      >
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-40 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-neutral-600" />
            </div>
            <h3 className="text-2xl font-black mb-2">No results found</h3>
            <p className="text-neutral-500 font-medium">Try adjusting your filters or search terms.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-8 text-orange-500 font-black uppercase tracking-widest text-xs hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </main>

      {/* Footer Minimal */}
      <footer className="py-20 border-t border-white/5 relative z-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Image src="/icon.png" alt="Logo" width={16} height={16} className="brightness-200" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em]">Adityanveshan</span>
          </div>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Yagya Ashram. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
