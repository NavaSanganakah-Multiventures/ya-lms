'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, FileText, MonitorPlay, CheckCircle, Image as ImageIcon, X, Edit3, Sparkles, Wifi, Lock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import AITutor from '@/components/AITutor';
import EnhancedVideoPlayer from '@/components/EnhancedVideoPlayer';
import { AnimatePresence } from 'motion/react';
import { useLiveSession } from '@/contexts/LiveSessionContext';
import { formatLocalTime } from '@/lib/time';
import DOMPurify from 'isomorphic-dompurify';

function CourseLearnPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const { startSession } = useLiveSession();
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'videos' | 'recordings'>('curriculum');

  const fetchData = useCallback(async () => {
    try {
      const cRes = await fetch(`/api/courses/${id}`);
      if (cRes.ok) {
        const data = await cRes.json() as any;
        setCourse(data.course);
        setIsEnrolled(data.isEnrolled);
        setPaymentStatus(data.paymentStatus);
      }
      const lRes = await fetch(`/api/courses/${id}/lessons`);
      if (lRes.ok) {
        const data = await lRes.json() as any;
        const fetchedLessons = data.lessons || [];
        setLessons(fetchedLessons);
        setHasSubscription(Boolean(data.subscriptionCourseAccess));
        setPaymentStatus(prev => data.paymentStatus ?? prev);
        if (data.completedLessonIds) setCompletedLessonIds(data.completedLessonIds);

        const initialLessonId = searchParams.get('lessonId');
        if (initialLessonId && fetchedLessons.length > 0) {
          const targetLesson = fetchedLessons.find((l: any) => l.id === initialLessonId);
          if (targetLesson && !targetLesson.is_locked) setActiveLesson(targetLesson);
        }
      }
      const liveRes = await fetch(`/api/courses/${id}/live`);
      if (liveRes.ok) {
        const data = await liveRes.json() as any;
        setLiveSessions(data.sessions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [id, searchParams]);

  useEffect(() => { if (id) fetchData(); }, [id, fetchData]);

  const handleCompleteLesson = async (lessonId: string) => {
    if (!lessonId || completedLessonIds.includes(lessonId)) return;
    try {
      const res = await fetch(`/api/courses/${id}/lessons/${lessonId}/complete`, { method: 'POST' });
      if (res.ok) {
        setCompletedLessonIds(prev => [...prev, lessonId]);
      }
    } catch (err) {}
  };

  // Auto-complete non-video lessons after 5 seconds of viewing
  useEffect(() => {
    if (!activeLesson || completedLessonIds.includes(activeLesson.id)) return;
    if (activeLesson.type !== 'video' && activeLesson.type !== 'recording') {
      const timer = setTimeout(() => {
        handleCompleteLesson(activeLesson.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeLesson, completedLessonIds, id]);

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-5 h-5 text-orange-400" />;
      case 'recording': return <MonitorPlay className="w-5 h-5 text-purple-400" />;
      case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
      case 'live': return <MonitorPlay className="w-5 h-5 text-green-400" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-blue-400" />;
      case 'article': return <Edit3 className="w-5 h-5 text-yellow-400" />;
      default: return <FileText className="w-5 h-5 text-neutral-400" />;
    }
  };

  // Premium unlock is course-specific: paid enrollment or a subscription that includes this course.
  const isPremiumUnlocked = paymentStatus === 'paid' || hasSubscription;

  const filteredLessons = lessons.filter(lesson => {
    if (activeTab === 'curriculum') return true;
    if (activeTab === 'videos') return lesson.type === 'video';
    if (activeTab === 'recordings') return lesson.type === 'recording';
    return true;
  });

  const chapters = filteredLessons.reduce((acc: any, lesson) => {
    const chap = lesson.chapter_title || 'सामान्य';
    if (!acc[chap]) acc[chap] = [];
    acc[chap].push(lesson);
    return acc;
  }, {});

  const canAccessLesson = (lesson: any) => {
    if (isPremiumUnlocked) return true;
    if (isEnrolled && lesson.is_free === 1) return true;
    return false;
  };

  if (loading) return <div className="p-8 text-neutral-400 text-center animate-pulse">लोड हो रहा है...</div>;
  if (!course) return <div className="p-8 text-neutral-400 text-center">पाठ्यक्रम नहीं मिला।</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[85vh] animate-in fade-in duration-700">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {!activeLesson ? (
          // Welcome screen
          <div className="p-8 md:p-12 flex flex-col h-full">
            <Link href={`/dashboard/course?id=${id}`} className="inline-flex items-center text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors w-fit mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" /> कोर्स विवरण पर वापस जाएं
            </Link>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">{course.title}</h1>
            <p className="text-neutral-400 leading-relaxed mb-8 max-w-3xl">{course.description}</p>

            {/* Progress */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800/50 mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-neutral-400">प्रगति</span>
                <span className="text-sm font-black text-emerald-400">
                  {completedLessonIds.length}/{filteredLessons.length} पाठ पूर्ण
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${filteredLessons.length === 0 ? 0 : Math.round((completedLessonIds.length / filteredLessons.length) * 100)}%` }}
                />
              </div>
            </div>

            {/* Access warning */}
            {!isPremiumUnlocked && isEnrolled && course.price_inr > 0 && (
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-amber-400 font-bold">⚠ फ्री प्रीव्यू मोड</p>
                  <p className="text-neutral-400 text-sm mt-1">केवल फ्री पाठ देख सकते हैं। पूरा कोर्स खरीदें।</p>
                </div>
                <Link href={`/course?id=${id}`} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm whitespace-nowrap">
                  प्रीमियम खरीदें
                </Link>
              </div>
            )}

            {filteredLessons.length > 0 ? (
              <div className="mt-auto flex justify-end">
                <button
                  onClick={() => {
                    const firstAccessible = filteredLessons.find(l => canAccessLesson(l));
                    if (firstAccessible) setActiveLesson(firstAccessible);
                  }}
                  className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black shadow-xl shadow-orange-500/30 flex items-center gap-3 transition-all hover:scale-[1.02]"
                >
                  <PlayCircle className="w-6 h-6" /> सीखना शुरू करें
                </button>
              </div>
            ) : (
              <p className="text-neutral-500 text-center mt-auto">कोई पाठ उपलब्ध नहीं है।</p>
            )}
          </div>
        ) : (
          // Lesson player
          <div className="flex flex-col h-full relative">
            <div className="h-16 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setActiveLesson(null)} className="text-neutral-500 hover:text-white transition-colors mr-2">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="p-1.5 bg-neutral-900 rounded-lg border border-neutral-800 shrink-0">
                  {getLessonIcon(activeLesson.type)}
                </div>
                <h2 className="text-sm md:text-base font-bold text-white truncate">{activeLesson.title}</h2>
              </div>
              <button
                onClick={() => setIsTutorOpen(!isTutorOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isTutorOpen ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-orange-400 hover:bg-neutral-700'}`}
              >
                <Sparkles className={`w-4 h-4 ${isTutorOpen ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">AI Tutor</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-black relative flex flex-col">
              {(activeLesson.type === 'video' || activeLesson.type === 'recording') && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <EnhancedVideoPlayer 
                    src={activeLesson.content_url} 
                    onProgress={(pct) => {
                      if (pct >= 90) handleCompleteLesson(activeLesson.id);
                    }}
                  />
                </div>
              )}
              {activeLesson.type === 'pdf' && (
                <div className="w-full h-full bg-white relative">
                  <iframe src={`${activeLesson.content_url}#toolbar=0`} className="w-full h-full bg-neutral-100" title="PDF Document" />
                </div>
              )}
              {activeLesson.type === 'image' && (
                <div className="w-full h-full bg-neutral-950 relative flex justify-center items-center p-8">
                  <div className="relative w-full h-full max-h-[70vh]">
                    <Image src={activeLesson.content_url} alt={activeLesson.title} fill
                      className="object-contain rounded-lg select-none"
                      onContextMenu={(e) => e.preventDefault()} draggable={false} referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
              {activeLesson.type === 'live' && (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <div className="w-full max-w-lg bg-neutral-900 rounded-3xl border border-neutral-800 flex flex-col items-center justify-center p-12 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse mb-6">
                      <MonitorPlay className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3">लाइव क्लास रूम</h3>
                    <p className="text-neutral-400 text-sm mb-6">इस लाइव क्लास में शामिल होने के लिए नीचे बटन दबाएं:</p>
                    <button 
                      onClick={() => setActiveLesson({ ...activeLesson, type: 'liveClass', rtc_room_id: activeLesson.content_url, sessionId: activeLesson.id })}
                      className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black shadow-xl shadow-green-500/20 transition-all flex items-center gap-3"
                    >
                      <Wifi className="w-5 h-5 animate-pulse" /> क्लास में शामिल हों
                    </button>
                    <p className="text-[10px] text-neutral-600 mt-6 uppercase tracking-widest">ID: {activeLesson.content_url}</p>
                  </div>
                </div>
              )}
              {activeLesson.type === 'article' && (
                <div className="w-full h-full bg-white text-black p-8 md:p-12 overflow-y-auto">
                  <div className="max-w-3xl mx-auto prose ppink-lg ppink-neutral" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeLesson.text_content || '') }} />
                </div>
              )}
              {!activeLesson.content_url && activeLesson.type !== 'live' && activeLesson.type !== 'article' && (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-950">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-neutral-700" />
                    </div>
                    <p>कोई मीडिया लिंक नहीं है।</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="h-20 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                {(() => {
                  const accessibleLessons = filteredLessons.filter(l => canAccessLesson(l));
                  const currentIndex = accessibleLessons.findIndex(l => l.id === activeLesson.id);
                  const prev = currentIndex > 0 ? accessibleLessons[currentIndex - 1] : null;
                  const next = currentIndex < accessibleLessons.length - 1 ? accessibleLessons[currentIndex + 1] : null;
                  return (
                    <>
                      <button onClick={() => prev && setActiveLesson(prev)} disabled={!prev}
                        className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all">
                        पिछला
                      </button>
                      <button onClick={() => next && setActiveLesson(next)} disabled={!next}
                        className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all">
                        अगला
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>

            <AnimatePresence>
              {isTutorOpen && (
                <div className="absolute right-0 top-16 bottom-20 w-full sm:w-96 bg-neutral-950 border-l border-neutral-800 shadow-2xl z-40 flex flex-col">
                  <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-4">
                    <span className="font-bold text-orange-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Tutor</span>
                    <button onClick={() => setIsTutorOpen(false)} className="text-neutral-500 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <AITutor lesson={activeLesson} course={course} isOpen={true} onClose={() => {}} />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sidebar - Curriculum */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl lg:h-[85vh]">
        <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white">पाठ्यक्रम</h3>
            <Link href={`/dashboard/course?id=${id}`} className="text-xs font-bold text-orange-400 hover:text-orange-300 bg-orange-500/10 px-2 py-1 rounded-md flex items-center gap-1">
              <FileText className="w-3 h-3" /> विवरण
            </Link>
          </div>
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            {(['curriculum', 'videos', 'recordings'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-orange-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                {tab === 'curriculum' ? 'सभी' : tab === 'videos' ? 'वीडियो' : 'रिकॉर्डिंग'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'curriculum' && liveSessions.length > 0 && (
            <div className="p-3 border-b border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 px-2">Live Sessions</h4>
              <div className="space-y-2">
                {liveSessions.map((session: any) => {
                  const canJoin = isPremiumUnlocked || session.is_free === 1;
                  return (
                    <div key={session.id} className={`bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between border-l-2 ${session.status === 'live' ? 'border-green-500' : 'border-neutral-700'} ${!canJoin ? 'opacity-50' : ''}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold text-sm truncate">{session.title || `Live: ${session.rtc_room_id}`}</p>
                          {session.is_free === 1 && <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">FREE</span>}
                        </div>
                        <p className="text-neutral-500 text-[10px]">{formatLocalTime(session.start_time)}</p>
                      </div>
                      {session.status === 'live' && (
                        canJoin ? (
                          <button
                            onClick={() => startSession(session.rtc_room_id, session.id, false)}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ml-2 animate-pulse">
                            Join
                          </button>
                        ) : (
                          <div className="p-1.5 bg-neutral-900 rounded-lg text-neutral-600">
                            <Lock className="w-3 h-3" />
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(chapters).length === 0 ? (
            <div className="text-neutral-500 p-8 text-center text-sm">कोई सामग्री उपलब्ध नहीं है।</div>
          ) : (
            Object.keys(chapters).map((chapterTitle) => (
              <div key={chapterTitle} className="border-b border-neutral-800/50 last:border-0">
                <div className="bg-neutral-950/50 px-4 py-3 border-y border-neutral-800/50 sticky top-0 z-10 backdrop-blur-md">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{chapterTitle}</h4>
                </div>
                <div className="divide-y divide-neutral-800/30">
                  {chapters[chapterTitle].sort((a: any, b: any) => a.order_index - b.order_index).map((lesson: any) => {
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isActive = activeLesson?.id === lesson.id;
                    const accessible = canAccessLesson(lesson);
                    return (
                      <button key={lesson.id} disabled={!accessible} onClick={() => setActiveLesson(lesson)}
                        className={`w-full text-left p-3 transition-colors group flex gap-3 ${!accessible ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800/50'} ${isActive ? 'bg-orange-500/10' : ''}`}>
                        <div className="shrink-0 mt-0.5">
                          {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                            : isActive ? <div className="w-4 h-4 rounded-full border-2 border-orange-500 animate-pulse bg-orange-500/20" />
                            : !accessible ? <X className="w-4 h-4 text-neutral-600" />
                            : <div className="w-4 h-4 text-neutral-500">{getLessonIcon(lesson.type)}</div>
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium leading-snug truncate ${isActive ? 'text-orange-300 font-bold' : isCompleted ? 'text-neutral-400' : accessible ? 'text-neutral-300' : 'text-neutral-600'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">{lesson.type}</span>
                            {lesson.is_free === 1 && <span className="text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1 rounded">Free</span>}
                            {!accessible && <span className="text-[9px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1 rounded">Premium</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function CourseLearnPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400 text-center animate-pulse">लोड हो रहा है...</div>}>
      <CourseLearnPageContent />
    </Suspense>
  );
}
