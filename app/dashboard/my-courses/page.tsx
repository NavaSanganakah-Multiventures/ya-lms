'use client';

import { useEffect, useState } from 'react';
import { Loader2, BookOpen, Clock, ChevronRight, GraduationCap, Coins, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const getCourseTitle = (course: any) => language === 'hi' ? course.title_hi || course.title : course.title;

  useEffect(() => {
    fetch('/api/user/my-courses')
      .then(res => res.json())
      .then((data: any) => {
        setCourses(data.courses || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-neutral-500 font-medium animate-pulse text-sm uppercase tracking-widest">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <GraduationCap className="w-10 h-10 text-orange-500" />
            My Learning
          </h1>
          <p className="text-neutral-400 mt-2 text-lg">Manage your enrolled courses and continue your academic journey.</p>
        </div>
        <Link href="/dashboard" className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 group text-sm">
          Browse More Courses
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-neutral-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No courses enrolled yet</h3>
          <p className="text-neutral-500 max-w-sm mx-auto mb-8 text-sm">Start your journey today by enrolling in one of our transformative courses.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-orange-400 font-bold hover:text-orange-300 transition-colors uppercase tracking-widest text-xs">
            View All Courses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <div key={course.id} className="group relative bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden hover:border-orange-500/50 transition-all hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col">
              <div className="aspect-video relative overflow-hidden bg-neutral-800">
                 {course.thumbnail_url ? (
                   <div
                     className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                     style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                     role="img"
                     aria-label={getCourseTitle(course)}
                   />
                 ) : (
                   <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                     <ImageIcon className="h-10 w-10 text-neutral-700" />
                   </div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent z-10 opacity-60" />
                 <div className="absolute top-4 left-4 z-20 flex gap-2">
                    {course.payment_status === 'paid' ? (
                      <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/20 uppercase">PREMIUM UNLOCKED</span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-amber-500/20 uppercase">FREE PREVIEW MODE</span>
                    )}
                 </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {course.category_name || 'General'}
                </div>
                
                <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">{getCourseTitle(course)}</h3>
                {Number(course.self_study_enabled || 0) === 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
                      <Coins className="h-3 w-3" /> Credit Based
                    </span>
                    {course.payment_source === 'self_study_credits' && (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">Unlocked by credits</span>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                    <span className="text-neutral-500">Progress</span>
                    <span className="text-orange-500">{course.progress || 0}%</span>
                  </div>
                  <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-1000"
                      style={{ width: `${course.progress || 0}%` }}
                    />
                  </div>
                </div>

                <p className="text-neutral-400 text-sm mt-3 line-clamp-2 leading-relaxed flex-1">{language === 'hi' ? course.description_hi || course.description : course.description}</p>
                
                <div className="mt-6 pt-6 border-t border-neutral-800 flex items-center justify-between">
                   <div className="flex items-center gap-1.5 text-neutral-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">Self-paced</span>
                   </div>
                   <Link 
                    href={`/dashboard/course?id=${course.id}`}
                    className="flex items-center gap-2 text-white font-bold text-sm hover:text-orange-400 transition-colors group/btn"
                   >
                     {course.payment_status === 'paid' ? 'Continue' : 'Watch Previews'}
                     <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                   </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
