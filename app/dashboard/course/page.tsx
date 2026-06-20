'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, PlayCircle, CheckCircle, Lock, BookOpen,
  MonitorPlay, FileText, Image as ImageIcon, Edit3,
  Clock, Users, Award, Wifi, ShieldCheck, Loader2, Coins, Wallet, AlertCircle, Video, X, ExternalLink
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCredits } from '@/contexts/CreditsContext';

function CourseDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { language } = useLanguage();
  const { setCredits } = useCredits();

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [hasSubscriptionCourseAccess, setHasSubscriptionCourseAccess] = useState(false);
  const [selfStudyCredits, setSelfStudyCredits] = useState<any>(null);
  const [isUnlockingWithCredits, setIsUnlockingWithCredits] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [courseRes, lessonsRes, liveRes] = await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch(`/api/courses/${id}/lessons`),
          fetch(`/api/courses/${id}/live`)
        ]);

        if (!courseRes.ok) {
          if (courseRes.status === 404) {
            setCourse(null);
            return;
          }
          throw new Error(`Failed to fetch course: ${courseRes.status}`);
        }

        const courseData: any = await courseRes.json();

        let lessonData: any = { lessons: [] };
        if (lessonsRes.ok) {
          try {
            lessonData = await lessonsRes.json();
          } catch (e) {
            console.error("Failed to parse lessons JSON:", e);
          }
        }

        let liveData: any = { sessions: [] };
        if (liveRes.ok) {
          try {
            liveData = await liveRes.json();
          } catch (e) {
            console.error("Failed to parse live sessions JSON:", e);
          }
        }

        setCourse(courseData.course);
        setIsEnrolled(courseData.isEnrolled);
        setPaymentStatus(courseData.paymentStatus ?? lessonData.paymentStatus ?? null);
        setHasSubscriptionCourseAccess(Boolean(courseData.subscriptionCourseAccess || lessonData.subscriptionCourseAccess));
        setSelfStudyCredits(courseData.selfStudyCredits || null);
        setLessons(lessonData.lessons || []);
        setLiveSessions(liveData.sessions || []);
      } catch (err: any) {
        console.error("Error fetching course data:", err);
        setError("डेटा लोड करने में त्रुटि। कृपया पुनः प्रयास करें।");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleUnlockWithCredits = async () => {
    if (!id) return;
    setIsUnlockingWithCredits(true);
    try {
      const res = await fetch(`/api/courses/${id}/enroll-with-credits`, { method: 'POST' });
      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credit unlock failed');
      }
      setIsEnrolled(true);
      setPaymentStatus(data.paymentStatus || 'paid');
      if (data.selfStudyCredits) {
        setSelfStudyCredits(data.selfStudyCredits);
        setCredits(data.selfStudyCredits.balance);
      }
      const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
      if (lessonsRes.ok) {
        const lessonData: any = await lessonsRes.json();
        setLessons(lessonData.lessons || []);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUnlockingWithCredits(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      <p className="text-neutral-500 font-medium animate-pulse">कोर्स लोड हो रहा है...</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-32 space-y-4">
      <p className="text-red-400 font-medium">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors text-sm font-medium">
        पुनः प्रयास करें (Retry)
      </button>
      <br />
      <Link href="/dashboard" className="text-orange-400 hover:text-orange-300 mt-4 inline-block font-bold text-sm">← डैशबोर्ड पर वापस जाएं</Link>
    </div>
  );

  if (!course) return (
    <div className="text-center py-32">
      <p className="text-red-400 font-medium">पाठ्यक्रम नहीं मिला।</p>
      <Link href="/dashboard" className="text-orange-400 hover:text-orange-300 mt-4 inline-block font-bold">← डैशबोर्ड पर वापस जाएं</Link>
    </div>
  );

  const isPremiumUnlocked = paymentStatus === 'paid' || hasSubscriptionCourseAccess;
  const courseTitle = language === 'hi' ? course.title_hi || course.title : course.title;
  const courseDescription = language === 'hi' ? course.description_hi || course.description : course.description;
  const totalLessons = lessons.length;
  const freeLessons = lessons.filter(l => l.is_free === 1);
  const videoLessons = lessons.filter(l => l.type === 'video' || l.type === 'recording');
  const hasLive = liveSessions.length > 0;
  const isCreditBasedCourse = Number(course.self_study_enabled || 0) === 1;
  const courseCreditCost = Number(course.self_study_credit_cost || 0);
  const availableSelfStudyCredits = Number(selfStudyCredits?.balance || selfStudyCredits?.available || 0);
  const liveClassCreditsRequired = liveSessions.reduce((min: number, session: any) => {
    const required = Number(session.required_self_study_credits || 0);
    if (Number(session.live_join_requires_credits || 0) !== 1 || required <= 0) return min;
    return min === 0 ? required : Math.min(min, required);
  }, 0);
  const canUnlockWithCredits = isCreditBasedCourse && courseCreditCost > 0 && availableSelfStudyCredits >= courseCreditCost;

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-4 h-4 text-orange-400" />;
      case 'recording': return <MonitorPlay className="w-4 h-4 text-purple-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
      case 'live': return <MonitorPlay className="w-4 h-4 text-green-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'article': return <Edit3 className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4 text-neutral-400" />;
    }
  };

  // Group lessons by chapter
  const chapters = lessons.reduce((acc: any, lesson) => {
    const chap = lesson.chapter_title || 'सामान्य';
    if (!acc[chap]) acc[chap] = [];
    acc[chap].push(lesson);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" /> डैशबोर्ड पर वापस जाएं
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Course Info */}
        <div className="lg:col-span-2 space-y-8">

          {/* Hero */}
          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
            <div className="h-56 bg-gradient-to-br from-orange-900/60 to-purple-900/60 relative flex items-end overflow-hidden p-8">
              {course.thumbnail_url ? (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{ backgroundImage: `url(${course.thumbnail_url})` }}
                  role="img"
                  aria-label={courseTitle}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <ImageIcon className="h-16 w-16 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
              <div className="relative z-10">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black rounded-full inline-block uppercase tracking-widest">
                    {isPremiumUnlocked ? '✅ Premium Access' : isEnrolled ? '🔓 Free Preview' : '🔒 Enroll to Access'}
                  </span>
                  {isCreditBasedCourse && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      <Coins className="h-3 w-3" /> Credit Based
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">{courseTitle}</h1>
              </div>
            </div>
            <div className="p-8">
              <p className="text-neutral-300 text-lg leading-relaxed">{courseDescription}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
              <BookOpen className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{totalLessons}</p>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">कुल पाठ</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
              <PlayCircle className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{videoLessons.length}</p>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">वीडियो</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
              <Wifi className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{liveSessions.length}</p>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">लाइव सेशन</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-white">{freeLessons.length}</p>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mt-1">फ्री पाठ</p>
            </div>
          </div>

          {/* What's Included */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" /> इस कोर्स में क्या मिलेगा?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Clock className="w-5 h-5 text-orange-400" />, title: 'आजीवन एक्सेस (Lifetime)', desc: 'एक बार खरीदें, हमेशा के लिए एक्सेस करें।' },
                { icon: <MonitorPlay className="w-5 h-5 text-purple-400" />, title: 'क्लास रिकॉर्डिंग', desc: hasLive ? `${liveSessions.length} लाइव सत्रों की रिकॉर्डिंग उपलब्ध।` : 'प्री-रिकॉर्डेड वीडियो लेक्चर्स।' },
                { icon: <FileText className="w-5 h-5 text-red-400" />, title: 'स्टडी मटेरियल', desc: 'PDF नोट्स और पठन सामग्री।' },
                { icon: <Users className="w-5 h-5 text-emerald-400" />, title: 'बैच एक्सेस', desc: liveSessions.length > 0 ? `${liveSessions.length} लाइव बैच उपलब्ध।` : 'स्व-गति से सीखें (Self-paced)।' },
                { icon: <Award className="w-5 h-5 text-amber-400" />, title: 'सर्टिफिकेट', desc: 'कोर्स पूर्ण करने पर प्रमाण पत्र।' },
                { icon: <PlayCircle className="w-5 h-5 text-blue-400" />, title: 'मोबाइल & डेस्कटॉप', desc: 'किसी भी डिवाइस पर देखें।' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-neutral-950/50 rounded-2xl border border-neutral-800/50">
                  <div className="p-2 bg-neutral-900 rounded-xl border border-neutral-800 shrink-0">{item.icon}</div>
                  <div>
                    <p className="font-bold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-neutral-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum Preview */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-400" /> पाठ्यक्रम सूची (Curriculum)
              </h2>
              {!isPremiumUnlocked && isEnrolled && (
                <p className="text-xs text-amber-400 font-bold mt-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> केवल फ्री पाठ देख सकते हैं — प्रीमियम पाठ लॉक हैं।
                </p>
              )}
              {!isEnrolled && (
                <p className="text-xs text-neutral-500 font-bold mt-2">
                  नामांकन के बाद फ्री पाठ देख सकते हैं।
                </p>
              )}
            </div>

            <div className="divide-y divide-neutral-800/50">
              {Object.keys(chapters).map((chapterTitle) => (
                <div key={chapterTitle}>
                  <div className="px-6 py-3 bg-neutral-950/40 border-b border-neutral-800/30">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{chapterTitle}</h3>
                  </div>
                  {chapters[chapterTitle].sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => {
                    const isFree = lesson.is_free === 1;
                    const accessible = isPremiumUnlocked || (isEnrolled && isFree);
                    return (
                      <div key={lesson.id} className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-800/30 transition-colors">
                        <div className={`p-2 rounded-lg border shrink-0 ${accessible ? 'bg-orange-500/10 border-orange-500/20' : 'bg-neutral-950 border-neutral-800'}`}>
                          {accessible ? getLessonIcon(lesson.type) : <Lock className="w-4 h-4 text-neutral-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${accessible ? 'text-white' : 'text-neutral-500'}`}>{lesson.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-neutral-600 font-mono uppercase">{lesson.type}</span>
                            {isFree && <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">FREE</span>}
                            {!accessible && !isFree && <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">PREMIUM</span>}
                          </div>
                        </div>
                        {accessible && (
                          <Link href={`/dashboard/course/learn?id=${id}&lessonId=${lesson.id}`}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg transition-all whitespace-nowrap">
                            देखें
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {Object.keys(chapters).length === 0 && (
                <div className="p-12 text-center text-neutral-500 text-sm">अभी कोई पाठ नहीं जोड़ा गया है।</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Action Card */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-900 p-8 rounded-3xl border border-neutral-800 shadow-2xl lg:sticky lg:top-24 space-y-6">

            {/* Price */}
            <div>
              <p className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">कोर्स की कीमत</p>
              <p className="text-4xl font-black text-white">
                {course.price_inr > 0 ? `₹${course.price_inr}` : <span className="text-emerald-400">निःशुल्क</span>}
              </p>
            </div>

            {isCreditBasedCourse && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-violet-200 font-black text-sm">
                    <Coins className="w-5 h-5" /> Self-study credits
                  </div>
                  <span className="text-xs font-black text-violet-300">{courseCreditCost > 0 ? `${courseCreditCost} required` : 'Credit mode'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-neutral-950/60 px-3 py-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 text-neutral-400"><Wallet className="h-3.5 w-3.5" /> Available</span>
                  <span className="text-white">{availableSelfStudyCredits} credits</span>
                </div>
                {Number(course.individual_class_booking_enabled || 0) === 1 && Number(course.individual_class_credit_cost || 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-violet-200/80">Individual class: {course.individual_class_credit_cost} credits / {course.individual_class_duration_minutes || 30} min</p>
                    <button
                      onClick={() => { setShowBookingModal(true); setBookingResult(null); setBookingError(null); }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-xl font-bold text-xs transition-all"
                    >
                      <Video className="w-3.5 h-3.5" /> Individual Class Book करें
                    </button>
                  </div>
                )}
                {liveClassCreditsRequired > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold leading-relaxed text-amber-100">
                    <AlertCircle className="mr-1 inline h-4 w-4 text-amber-300" /> Live class join करने के लिए हर बार कम से कम {liveClassCreditsRequired} self-study credits अनिवार्य हैं — subscription, paid access या free preview से यह waive नहीं होगा।
                  </div>
                )}
              </div>
            )}

            {/* Status Badge */}
            {isPremiumUnlocked && (
              <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="w-5 h-5" /> प्रीमियम एक्सेस सक्रिय
              </div>
            )}
            {isEnrolled && !isPremiumUnlocked && (
              <div className="w-full py-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl font-black flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="w-5 h-5" /> फ्री प्रीव्यू एक्टिव
              </div>
            )}

            {/* Primary CTA */}
            {isPremiumUnlocked ? (
              <Link href={`/dashboard/course/learn?id=${id}`}
                className="flex items-center justify-center gap-3 w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-orange-500/30 hover:scale-[1.02]">
                <PlayCircle className="w-6 h-6" /> सीखना शुरू करें
              </Link>
            ) : isEnrolled ? (
              <div className="space-y-3">
                <Link href={`/dashboard/course/learn?id=${id}`}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-orange-500/30 hover:scale-[1.02]">
                  <PlayCircle className="w-6 h-6" /> फ्री पाठ देखें
                </Link>
                {course.price_inr > 0 && (
                  <Link href={`/course?id=${id}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-2xl font-bold transition-all text-sm">
                    🔓 प्रीमियम अनलॉक करें — ₹{course.price_inr}
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isCreditBasedCourse && courseCreditCost > 0 && (
                  <button
                    onClick={handleUnlockWithCredits}
                    disabled={isUnlockingWithCredits || !canUnlockWithCredits}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-violet-500/20 disabled:shadow-none"
                  >
                    {isUnlockingWithCredits ? <Loader2 className="w-5 h-5 animate-spin" /> : <Coins className="w-5 h-5" />}
                    {canUnlockWithCredits ? `Credits से Unlock करें (${courseCreditCost})` : `Credits कम हैं (${availableSelfStudyCredits}/${courseCreditCost})`}
                  </button>
                )}
                <Link href={`/course?id=${id}`}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-white text-black hover:bg-orange-600 hover:text-white rounded-2xl font-black transition-all shadow-xl hover:scale-[1.02]">
                  अभी नामांकन करें
                </Link>
              </div>
            )}

            {/* What's included mini list */}
            <div className="pt-4 border-t border-neutral-800 space-y-3">
              <p className="text-xs font-black text-neutral-500 uppercase tracking-widest">इसमें शामिल है:</p>
              {[
                `${totalLessons} पाठ (${freeLessons.length} फ्री)`,
                'आजीवन एक्सेस',
                hasLive ? `${liveSessions.length} लाइव सत्र${liveClassCreditsRequired > 0 ? ` • ${liveClassCreditsRequired}+ credits/class जरूरी` : ''}` : 'स्व-गति से सीखें',
                'क्लास रिकॉर्डिंग',
                'AI Tutor सहायता',
                'सर्टिफिकेट',
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-neutral-400">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Individual Class Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !bookingLoading && setShowBookingModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><Video className="w-5 h-5 text-violet-400" /> Book Individual Class</h3>
              <button onClick={() => { if (!bookingLoading) { setShowBookingModal(false); setBookingResult(null); } }} aria-label="Close"><X className="w-5 h-5 text-neutral-500 hover:text-white" /></button>
            </div>

            {bookingResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-black">Class Booked!</p>
                  <p className="text-xs text-neutral-400 mt-1">{bookingResult.credits_charged} credits charged</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">Duration</span>
                    <span className="text-white font-bold">{bookingResult.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">Meeting ID</span>
                    <span className="text-violet-300 font-mono text-xs">{bookingResult.rtc_room_id}</span>
                  </div>
                </div>
                <a
                  href={`/live?roomId=${bookingResult.rtc_room_id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> Join Class Now
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">{bookingError}</div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">Credits required</span>
                    <span className="text-violet-300 font-bold">{course.individual_class_credit_cost}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">Duration</span>
                    <span className="text-white font-bold">{course.individual_class_duration_minutes || 30} minutes</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setBookingLoading(true);
                    setBookingError(null);
                    try {
                      const res = await fetch(`/api/courses/${id}/individual/book`, { method: 'POST' });
                      const data = await res.json() as any;
                      if (!res.ok) throw new Error(data.message || data.error || 'Booking failed');
                      setBookingResult(data);
                    } catch (e: any) {
                      setBookingError(e.message);
                    } finally {
                      setBookingLoading(false);
                    }
                  }}
                  disabled={bookingLoading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold transition-all"
                >
                  {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  {bookingLoading ? 'Booking...' : `Confirm — ${course.individual_class_credit_cost} credits`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-neutral-500 font-medium animate-pulse">लोड हो रहा है...</p>
      </div>
    }>
      <CourseDetailContent />
    </Suspense>
  );
}
