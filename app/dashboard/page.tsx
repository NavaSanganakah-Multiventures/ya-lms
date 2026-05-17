'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, BookOpen, AlertCircle, Video, Calendar, ArrowRight, Play, Coins, Wallet, ImageIcon } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatLocalTimeOnly } from '@/lib/time';
import { useLiveSession } from '@/contexts/LiveSessionContext';

export default function DashboardPage() {
  const [data, setData] = useState<any>({
    enrolledCourses: [],
    todayLive: [],
    tomorrowLive: [],
    availableCourses: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const { formatPrice, getCoursePrice } = useCurrency();
  const { t, language } = useLanguage();
  const { startSession } = useLiveSession();

  useEffect(() => {
    const fetchDashboardInfo = async () => {
      try {
        // ⚡ Bolt: Fetch profile and dashboard data concurrently to prevent waterfall
        const [profileRes, dashRes] = await Promise.all([
          fetch('/api/user/profile').catch((err) => {
            console.error('Failed to load profile status:', err);
            return null;
          }),
          fetch('/api/user/dashboard-data').catch((err) => {
            console.error('Failed to fetch dashboard data:', err);
            return null;
          }),
        ]);

        // Process profile
        if (profileRes && profileRes.ok) {
          try {
            const profileData: any = await profileRes.json();
            const u = profileData?.user;
            if (u && (!u.full_name || !u.phone || !u.birth_date || !u.father_name || !u.mother_name || !u.grand_father_name)) {
              setProfileIncomplete(true);
            }
          } catch (err) {
            console.error('Failed to parse profile data:', err);
          }
        }

        // Process dashboard data
        if (dashRes && dashRes.ok) {
          try {
            const dashData = await dashRes.json();
            setData(dashData);
          } catch (err) {
            console.error('Failed to parse dashboard data:', err);
          }
        } else if (dashRes) {
          console.error('Failed to load dashboard data:', dashRes.status);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-neutral-500 text-sm font-medium animate-pulse">{t('common.loading')}</p>
      </div>
    );
  }

  const hasLiveToday = data.todayLive?.length > 0;
  const hasLiveTomorrow = data.tomorrowLive?.length > 0;
  const hasEnrolled = data.enrolledCourses?.length > 0;
  const selfStudyCredits = Number(data.selfStudyCredits?.balance || data.selfStudyCredits?.available || 0);
  const isCreditBasedCourse = (course: any) => Number(course.self_study_enabled || 0) === 1;
  const getCourseCreditCost = (course: any) => Number(course.self_study_credit_cost || 0);
  const getCourseTitle = (course: any) => language === 'hi' ? course.title_hi || course.title : course.title;

  return (
    <div className="space-y-10">
      {/* ── Profile Incomplete Alert ── */}
      {profileIncomplete && (
        <div className="p-5 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-orange-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
             <div className="bg-orange-500/20 p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-orange-400" />
             </div>
             <div>
                <p className="text-white font-bold text-lg">{t('dashboard.incomplete_profile')}</p>
                <p className="text-sm text-neutral-400">{t('dashboard.fill_details')}</p>
             </div>
          </div>
          <Link href="/dashboard/profile" className="w-full md:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-orange-500/30 active:scale-95 text-center">
             {t('dashboard.fill_now')}
          </Link>
        </div>
      )}

      {/* ── 1. Priority Section: LIVE NOW & TODAY ── */}
      {(hasLiveToday || hasLiveTomorrow) && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-red-500/10 rounded-lg">
                <Video className="w-5 h-5 text-red-500" />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight uppercase">{t('dashboard.today_live')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hasLiveToday ? data.todayLive.map((session: any) => (
              <div key={session.id} className="group relative bg-neutral-900/50 backdrop-blur-md border border-red-500/30 rounded-2xl p-5 flex items-center justify-between gap-4 hover:bg-red-500/5 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t('dashboard.live_now')}</span>
                  </div>
                  <h3 className="text-white font-bold truncate group-hover:text-red-400 transition-colors">
                    {language === 'hi' ? session.title_hi || session.title : session.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 truncate">
                    {language === 'hi' ? session.course_title_hi || session.course_title : session.course_title}
                  </p>
                  {Number(session.live_join_requires_credits || 0) === 1 && Number(session.required_self_study_credits || 0) > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-200">
                      <Coins className="h-3 w-3" /> Join requires {session.required_self_study_credits} self-study credits
                    </p>
                  )}
                </div>
                <button
                  onClick={() => startSession(session.rtc_room_id, session.id, false)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 whitespace-nowrap"
                >
                  {t('dashboard.join_now')}
                </button>
              </div>
            )) : (
              <div className="col-span-full py-10 bg-neutral-900/30 border border-neutral-800 border-dashed rounded-2xl flex flex-col items-center justify-center opacity-50">
                 <Video className="w-8 h-8 text-neutral-600 mb-2" />
                 <p className="text-sm text-neutral-500">{t('dashboard.no_live_sessions')}</p>
              </div>
            )}
          </div>

          {/* Tomorrow Preview */}
          {hasLiveTomorrow && (
             <div className="mt-6 p-4 bg-neutral-900/50 border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Calendar className="w-4 h-4 text-orange-400" />
                   <span className="text-sm font-bold text-neutral-300">{t('dashboard.tomorrow_live')}</span>
                </div>
                <div className="flex items-center gap-2">
                   {data.tomorrowLive.slice(0, 3).map((s: any) => (
                      <div key={s.id} className="px-2 py-1 bg-neutral-800 rounded-md text-[10px] text-neutral-400 font-mono">
                         {formatLocalTimeOnly(s.start_time)}
                      </div>
                   ))}
                   {data.tomorrowLive.length > 3 && <span className="text-[10px] text-neutral-600">+{data.tomorrowLive.length - 3}</span>}
                </div>
             </div>
          )}
        </section>
      )}

      {/* ── 2. Enrolled Courses Section ── */}
      {hasEnrolled && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Play className="w-5 h-5 text-orange-500" />
               </div>
               <h2 className="text-xl font-black text-white tracking-tight uppercase">{t('dashboard.enrolled_courses')}</h2>
            </div>
            <Link href="/dashboard/my-courses" className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1 group">
               {t('common.view_all')} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.enrolledCourses.map((course: any) => (
              <div key={course.id} className="group flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-orange-500/50 transition-all hover:shadow-2xl hover:shadow-orange-500/10">
                <Link href={`/dashboard/course?id=${course.id}`} className="h-40 bg-neutral-800 relative overflow-hidden block">
                   {course.thumbnail_url ? (
                     <div
                       className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-700 group-hover:scale-110"
                       style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                       role="img"
                       aria-label={getCourseTitle(course)}
                     />
                   ) : (
                     <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-purple-500/10 group-hover:scale-110 transition-transform duration-700 flex items-center justify-center">
                       <ImageIcon className="h-10 w-10 text-neutral-700" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                         <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                   </div>
                </Link>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {course.category_name || 'General'}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                    {getCourseTitle(course)}
                  </h3>
                  {isCreditBasedCourse(course) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-300">
                        <Coins className="h-3 w-3" /> Credit Based
                      </span>
                      {course.payment_source === 'self_study_credits' && (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                          Unlocked by credits
                        </span>
                      )}
                    </div>
                  )}

                  {/* Progress Mini Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[9px] font-bold tracking-widest uppercase">
                      <span className="text-neutral-600">{course.progress || 0}% {t('common.completed')}</span>
                    </div>
                    <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all duration-1000"
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500 mt-2 line-clamp-2 flex-1">
                    {language === 'hi' ? course.description_hi || course.description : course.description}
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{t('dashboard.enrolled_courses')}</span>
                     <Link href={`/dashboard/course?id=${course.id}`} className="p-2 bg-neutral-800 rounded-lg text-white hover:bg-orange-600 transition-all">
                        <ArrowRight className="w-4 h-4" />
                     </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Explore Courses Section ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-neutral-800 rounded-lg">
              <BookOpen className="w-5 h-5 text-neutral-400" />
           </div>
           <h2 className="text-xl font-black text-white tracking-tight uppercase">{t('dashboard.available_courses')}</h2>
        </div>

        {(!data.availableCourses || data.availableCourses.length === 0) ? (
          <div className="text-center py-20 bg-neutral-900/20 rounded-3xl border border-neutral-800 border-dashed">
            <BookOpen className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-600">{t('dashboard.available_courses')}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.availableCourses?.map((course: any) => (
              <div key={course.id} className="group flex flex-col bg-neutral-900/40 rounded-3xl border border-neutral-800 overflow-hidden hover:border-white/20 transition-all">
                <div className="h-44 bg-neutral-900 relative overflow-hidden">
                   {course.thumbnail_url ? (
                     <div
                       className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-700 group-hover:scale-110"
                       style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                       role="img"
                       aria-label={getCourseTitle(course)}
                     />
                   ) : (
                     <div className="absolute inset-0 bg-neutral-800/50 flex items-center justify-center">
                       <ImageIcon className="h-10 w-10 text-neutral-700" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
                   <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                    <span className="bg-orange-600 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-lg shadow-orange-500/20">{getCoursePrice(course)}</span>
                    {isCreditBasedCourse(course) && (
                      <span className="inline-flex items-center gap-1 bg-violet-600 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-lg shadow-violet-500/20">
                        <Coins className="h-3.5 w-3.5" /> {getCourseCreditCost(course) > 0 ? `${getCourseCreditCost(course)} credits` : 'Credit mode'}
                      </span>
                    )}
                   </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {course.category_name || 'General'}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {getCourseTitle(course)}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mb-6">
                    {language === 'hi' ? course.description_hi || course.description : course.description}
                  </p>
                  {isCreditBasedCourse(course) && (
                    <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3 text-xs text-violet-200">
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span className="inline-flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Your credits</span>
                        <span>{selfStudyCredits}</span>
                      </div>
                      {getCourseCreditCost(course) > 0 && (
                        <p className="mt-1 text-violet-300/80">Course unlock: {getCourseCreditCost(course)} self-study credits</p>
                      )}
                      {Number(course.min_group_class_credit_cost || 0) > 0 && (
                        <p className="mt-1 text-violet-300/80">Group class from {course.min_group_class_credit_cost} credits/class</p>
                      )}
                    </div>
                  )}
                  <Link 
                    href={`/dashboard/course?id=${course.id}`}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    {t('dashboard.details')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
