'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, FileText, MonitorPlay, CheckCircle, Image as ImageIcon, X, Edit3, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import AITutor from '@/components/AITutor';
import EnhancedVideoPlayer from '@/components/EnhancedVideoPlayer';
import { AnimatePresence, motion } from 'motion/react';
import LiveClassWindow from '../../components/LiveClassWindow';

function CourseLearnPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
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
      }
      const lRes = await fetch(`/api/courses/${id}/lessons`);
      if (lRes.ok) {
        const data = await lRes.json() as any;
        const fetchedLessons = data.lessons || [];
        setLessons(fetchedLessons);
        if (data.completedLessonIds) {
          setCompletedLessonIds(data.completedLessonIds);
        }
        
        // Auto-select initial lesson if provided
        const initialLessonId = searchParams.get('lessonId');
        if (initialLessonId && fetchedLessons.length > 0) {
          const targetLesson = fetchedLessons.find((l: any) => l.id === initialLessonId);
          if (targetLesson) setActiveLesson(targetLesson);
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

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;
    try {
      const res = await fetch(`/api/courses/${id}/lessons/${activeLesson.id}/complete`, { method: 'POST' });
      if (res.ok) {
        setCompletedLessonIds((prev) => [...prev, activeLesson.id]);
        setActiveLesson(null);
      }
    } catch (err) {}
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
        case 'video': return <PlayCircle className="w-5 h-5 text-indigo-400" />;
        case 'recording': return <MonitorPlay className="w-5 h-5 text-purple-400" />;
        case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
        case 'live': return <MonitorPlay className="w-5 h-5 text-green-400" />;
        case 'image': return <ImageIcon className="w-5 h-5 text-blue-400" />;
        case 'article': return <Edit3 className="w-5 h-5 text-yellow-400" />;
        default: return <FileText className="w-5 h-5 text-neutral-400" />;
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    // If not enrolled, only show free lessons
    if (!isEnrolled && lesson.is_free !== 1) return false;
    
    if (activeTab === 'curriculum') return lesson.type !== 'video' && lesson.type !== 'recording';
    if (activeTab === 'videos') return lesson.type === 'video';
    if (activeTab === 'recordings') return lesson.type === 'recording';
    return true;
  });

  const chapters = filteredLessons.reduce((acc: any, lesson) => {
    const chap = lesson.chapter_title || 'General';
    if (!acc[chap]) acc[chap] = [];
    acc[chap].push(lesson);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-neutral-400 text-center animate-pulse">लोड हो रहा है...</div>;
  if (!course) return <div className="p-8 text-neutral-400 text-center">पाठ्यक्रम नहीं मिला।</div>;

  if (!id) return <div className="p-8 text-neutral-400 text-center animate-pulse">पहचानकर्ता लोड हो रहा है...</div>;

  // Calculate overall progress
  const totalLessons = filteredLessons.length;
  const completedCount = completedLessonIds.length;
  const progressPercent = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[85vh] animate-in fade-in duration-700">
      
      {/* Main Content Area (Left/Top) */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {!activeLesson ? (
          // Overview / Welcome Screen
          <div className="p-8 md:p-12 flex flex-col h-full">
            <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors w-fit mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" /> डैशबोर्ड पर वापस जाएं
            </Link>
            
            <div className="mb-10">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Course Dashboard</span>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">{course.title}</h1>
              <p className="text-neutral-400 text-base md:text-lg leading-relaxed max-w-3xl">{course.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800/50">
                <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider mb-2">कुल पाठ (Lessons)</p>
                <p className="text-3xl font-black text-white">{totalLessons}</p>
              </div>
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800/50">
                <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider mb-2">पूर्ण किए गए</p>
                <p className="text-3xl font-black text-white">{completedCount}</p>
              </div>
              <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800/50">
                <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider mb-2">प्रगति (Progress)</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-black text-emerald-400">{progressPercent}%</p>
                  <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {!isEnrolled && (
              <div className="mt-auto p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-indigo-400 font-bold text-lg">पूरा कोर्स अनलॉक करें</h3>
                  <p className="text-neutral-400 text-sm mt-1">प्रीमियम कंटेंट देखने के लिए कोर्स खरीदें।</p>
                </div>
                <Link href={`/course?id=${course.id}`} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                  नामांकन करें
                </Link>
              </div>
            )}
            
            {isEnrolled && filteredLessons.length > 0 && (
              <div className="mt-auto flex justify-end">
                 <button onClick={() => setActiveLesson(filteredLessons[0])} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 flex items-center gap-3 transition-all hover:scale-[1.02]">
                   <PlayCircle className="w-6 h-6" /> सीखना शुरू करें
                 </button>
              </div>
            )}
          </div>
        ) : (
          // Active Lesson View
          <div className="flex flex-col h-full relative">
            {/* Header */}
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
              
              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => setIsTutorOpen(!isTutorOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${isTutorOpen ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-indigo-400 hover:bg-neutral-700'}`}
                >
                  <Sparkles className={`w-4 h-4 ${isTutorOpen ? 'animate-pulse' : ''}`} />
                  <span className="hidden sm:inline">AI Tutor</span>
                </button>
              </div>
            </div>

            {/* Media/Content Player */}
            <div className={`flex-1 overflow-auto bg-black relative flex flex-col transition-all duration-300`}>
              {(activeLesson.type === 'video' || activeLesson.type === 'recording') && (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <EnhancedVideoPlayer src={activeLesson.content_url} />
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
                     <Image 
                       src={activeLesson.content_url} 
                       alt={activeLesson.title} 
                       fill
                       className="object-contain rounded-lg select-none" 
                       onContextMenu={(e) => e.preventDefault()}
                       draggable={false}
                       referrerPolicy="no-referrer"
                     />
                  </div>
                </div>
              )}
              
              {activeLesson.type === 'liveClass' && (
                 <div className="w-full h-full relative">
                   <LiveClassWindow 
                     roomId={activeLesson.rtc_room_id} 
                     sessionId={activeLesson.sessionId}
                     onClose={() => setActiveLesson(null)} 
                   />
                 </div>
              )}
              
              {activeLesson.type === 'live' && (
                <div className="w-full h-full flex items-center justify-center p-8">
                   <div className="w-full max-w-lg bg-neutral-900 rounded-3xl border border-neutral-800 flex flex-col items-center justify-center p-12 text-center shadow-2xl">
                     <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse mb-6">
                       <MonitorPlay className="w-10 h-10 text-green-400" />
                     </div>
                     <h3 className="text-2xl font-black text-white mb-3">लाइव क्लास रूम</h3>
                     <p className="text-neutral-400 text-sm mb-6">कक्षा Cloudflare रियल-टाइम किट के माध्यम से जुड़ती है। आपका रूम ID है:</p>
                     <div className="bg-black border border-neutral-800 text-indigo-400 font-mono py-3 px-6 rounded-xl text-lg select-all w-full">
                       {activeLesson.content_url}
                     </div>
                   </div>
                </div>
              )}

              {activeLesson.type === 'article' && (
                <div className="w-full h-full bg-white text-black p-8 md:p-12 overflow-y-auto">
                  <div className="max-w-3xl mx-auto prose prose-lg prose-neutral" dangerouslySetInnerHTML={{ __html: activeLesson.text_content || '' }} />
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

            {/* Bottom Actions / Next Prev */}
            <div className="h-20 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between px-6 flex-shrink-0">
              <div>
                <button 
                  onClick={handleCompleteLesson}
                  disabled={completedLessonIds.includes(activeLesson.id)}
                  className={`py-2.5 px-5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${completedLessonIds.includes(activeLesson.id) ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {completedLessonIds.includes(activeLesson.id) ? 'पूर्ण हो गया' : 'पूर्ण हुआ चिह्नित करें'}
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Find current index to do Next/Prev */}
                {(() => {
                  const currentIndex = filteredLessons.findIndex(l => l.id === activeLesson.id);
                  const prevLesson = currentIndex > 0 ? filteredLessons[currentIndex - 1] : null;
                  const nextLesson = currentIndex < filteredLessons.length - 1 ? filteredLessons[currentIndex + 1] : null;
                  
                  return (
                    <>
                      <button 
                        onClick={() => prevLesson && setActiveLesson(prevLesson)}
                        disabled={!prevLesson}
                        className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all"
                      >
                        पिछला
                      </button>
                      <button 
                        onClick={() => nextLesson && setActiveLesson(nextLesson)}
                        disabled={!nextLesson}
                        className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all"
                      >
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
                    <span className="font-bold text-indigo-400 flex items-center gap-2">
                       <Sparkles className="w-4 h-4" /> AI Tutor
                    </span>
                    <button onClick={() => setIsTutorOpen(false)} className="text-neutral-500 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <AITutor 
                      lesson={activeLesson} 
                      course={course} 
                      isOpen={true} 
                      onClose={() => {}} 
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Right Sidebar - Curriculum */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl lg:h-[85vh]">
        <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex flex-col gap-3">
          <h3 className="font-black text-white">पाठ्यक्रम (Curriculum)</h3>
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button 
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'curriculum' ? 'bg-indigo-600 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              सभी
            </button>
            <button 
              onClick={() => setActiveTab('videos')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'videos' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              वीडियो
            </button>
            <button 
              onClick={() => setActiveTab('recordings')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'recordings' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              रिकॉर्डिंग
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'curriculum' && liveSessions.length > 0 && (
            <div className="p-3 border-b border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 px-2">Live Sessions</h4>
              <div className="space-y-2">
                {liveSessions.map((session: any) => (
                  <div key={session.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between border-l-2 border-green-500">
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">Live: {session.rtc_room_id}</p>
                      <p className="text-neutral-500 text-[10px]">{new Date(session.start_time).toLocaleString('hi-IN')}</p>
                    </div>
                    {session.status === 'live' && (
                      <button 
                        onClick={() => setActiveLesson({ 
                          type: 'liveClass', 
                          title: `Live: ${session.rtc_room_id}`, 
                          rtc_room_id: session.rtc_room_id,
                          sessionId: session.id 
                        })}
                        className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ml-2 animate-pulse"
                      >
                        Join
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(chapters).length === 0 ? (
            <div className="text-neutral-500 p-8 text-center text-sm">
              कोई सामग्री उपलब्ध नहीं है।
            </div>
          ) : (
            Object.keys(chapters).map((chapterTitle) => (
              <div key={chapterTitle} className="border-b border-neutral-800/50 last:border-0">
                <div className="bg-neutral-950/50 px-4 py-3 border-y border-neutral-800/50 sticky top-0 z-10 backdrop-blur-md">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{chapterTitle}</h4>
                </div>
                <div className="divide-y divide-neutral-800/30">
                  {chapters[chapterTitle].sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any) => {
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const isActive = activeLesson?.id === lesson.id;
                    
                    return (
                      <button 
                        key={lesson.id} 
                        disabled={!isEnrolled && lesson.is_free !== 1}
                        onClick={() => setActiveLesson(lesson)}
                        className={`w-full text-left p-3 transition-colors group flex gap-3 ${!isEnrolled && lesson.is_free !== 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800/50'} ${isActive ? 'bg-indigo-500/10' : ''}`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : isActive ? (
                            <div className="w-4 h-4 rounded-full border-2 border-indigo-500 animate-pulse bg-indigo-500/20" />
                          ) : (
                            <div className="w-4 h-4 text-neutral-500">{getLessonIcon(lesson.type)}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium leading-snug truncate ${isActive ? 'text-indigo-300 font-bold' : isCompleted ? 'text-neutral-400' : 'text-neutral-300'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                              {lesson.type}
                            </span>
                            {lesson.is_free === 1 && !isEnrolled && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1 rounded">Free</span>
                            )}
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
