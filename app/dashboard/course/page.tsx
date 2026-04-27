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
        setLessons(data.lessons || []);
        if (data.completedLessonIds) {
          setCompletedLessonIds(data.completedLessonIds);
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
  }, [id]);

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

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> डैशबोर्ड पर वापस जाएं
      </Link>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-10 shadow-xl">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-3">{course.title}</h1>
        <p className="text-neutral-400 text-sm md:text-base leading-relaxed mb-8">{course.description}</p>
        
        {/* Navigation Tabs */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-8 pt-8 border-t border-neutral-800">
          <div className="flex bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800/50 w-full md:w-fit">
            <button 
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'curriculum' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              अध्ययन सामग्री
            </button>
            <button 
              onClick={() => setActiveTab('videos')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'videos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              कोर्स वीडियो
            </button>
            <button 
              onClick={() => setActiveTab('recordings')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'recordings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              क्लास रिकॉर्डिंग्स
            </button>
          </div>

          {!isEnrolled && (
            <Link 
              href={`/course?id=${course.id}`}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-bold transition-all shadow-xl shadow-indigo-500/30 animate-shimmer"
            >
              पूरा कोर्स अनलॉक करें
            </Link>
          )}
        </div>
      </div>

      {activeTab === 'curriculum' && liveSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white px-2">लाइव सेशन (Live Classes)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveSessions.map((session: any) => (
              <div key={session.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between border-l-4 border-green-500 shadow-lg">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-full ${session.status === 'live' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
                      <MonitorPlay className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-white font-bold text-lg">लाइव सत्र: {session.rtc_room_id}</p>
                     <p className="text-neutral-400 text-sm">{new Date(session.start_time).toLocaleString('hi-IN')}</p>
                   </div>
                </div>
                {session.status === 'live' ? (
                  <button 
                    onClick={() => setActiveLesson({ 
                      type: 'liveClass', 
                      title: `Live: ${session.rtc_room_id}`, 
                      rtc_room_id: session.rtc_room_id,
                      sessionId: session.id 
                    })}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                  >
                    अभी जुड़ें
                  </button>
                ) : (
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">{session.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white px-2">
           {activeTab === 'curriculum' ? 'पाठ्यक्रम संरचना' : activeTab === 'videos' ? 'प्री-रिकॉर्डेड लेक्चर्स' : 'क्लास रिकॉर्डिंग्स'}
        </h2>
        
        {Object.keys(chapters).length === 0 ? (
          <div className="text-neutral-500 p-8 text-center bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
            {activeTab === 'curriculum' ? 'शिक्षक ने अभी तक कोई पाठ नहीं जोड़ा है।' : activeTab === 'videos' ? 'कोई वीडियो उपलब्ध नहीं है।' : 'कोई रिकॉर्डिंग उपलब्ध नहीं है।'}
          </div>
        ) : (
          Object.keys(chapters).map((chapterTitle) => (
            <div key={chapterTitle} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-neutral-800/60 px-6 py-4 border-b border-neutral-800">
                <h3 className="font-semibold text-white tracking-wide">{chapterTitle}</h3>
              </div>
              <div className="divide-y divide-neutral-800/80">
                {chapters[chapterTitle].sort((a:any, b:any) => a.order_index - b.order_index).map((lesson: any) => {
                  const isCompleted = completedLessonIds.includes(lesson.id);
                  const isActive = activeLesson?.id === lesson.id;
                  
                  return (
                  <motion.div
                    key={lesson.id}
                    animate={{ backgroundColor: isCompleted ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}
                  >
                    <button 
                      key={lesson.id} 
                      disabled={!isEnrolled}
                      onClick={() => setActiveLesson(lesson)}
                      className={`w-full text-left flex flex-col md:flex-row md:items-center justify-between p-4 px-6 transition-colors group ${isEnrolled ? 'hover:bg-neutral-800/80 cursor-pointer' : 'opacity-70 cursor-not-allowed'} ${isActive ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl border transition-colors ${isCompleted ? 'bg-green-500/10 border-green-500/30' : isActive ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-neutral-950 border-neutral-800 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10'}`}>
                          {isCompleted ? <CheckCircle className="w-5 h-5 text-green-500" /> : getLessonIcon(lesson.type)}
                        </div>
                        <div>
                          <p className={`font-medium transition-colors ${isActive ? 'text-white' : isCompleted ? 'text-neutral-300' : isEnrolled ? 'text-neutral-300 group-hover:text-indigo-400' : 'text-neutral-400'}`}>
                            {lesson.title}
                          </p>
                          <p className={`text-xs font-mono mt-1 uppercase tracking-wider ${isCompleted ? 'text-green-500/70' : 'text-neutral-500'}`}>
                            {isCompleted ? 'पूर्ण हो गया' : lesson.type === 'video' ? 'वीडियो' : lesson.type === 'pdf' ? 'दस्तावेज़' : lesson.type === 'image' ? 'चित्र' : lesson.type === 'live' ? 'लाइव क्लास' : lesson.type === 'article' ? 'लेख (Article)' : lesson.type}
                          </p>
                        </div>
                      </div>
                      {!isEnrolled && (
                        <span className="text-xs text-neutral-500 mt-2 md:mt-0 font-medium bg-neutral-800 px-2 py-1 rounded">लॉक</span>
                      )}
                    </button>
                  </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {activeLesson && (
        <div className="fixed inset-0 bg-neutral-950/95 backdrop-blur-md z-50 flex flex-col">
          <div className="h-16 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              {getLessonIcon(activeLesson.type)}
              <h2 className="text-lg font-bold text-white truncate max-w-[150px] sm:max-w-md">{activeLesson.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsTutorOpen(!isTutorOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isTutorOpen ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
              >
                <Sparkles className={`w-4 h-4 ${isTutorOpen ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">AI Tutor</span>
              </button>
              <div className="w-px h-6 bg-neutral-800 mx-1" />
              <button onClick={() => { setActiveLesson(null); setIsTutorOpen(false); }} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                 <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className={`flex-1 overflow-auto flex flex-col p-4 md:p-8 transition-all duration-300 ${isTutorOpen ? 'lg:mr-96' : ''}`}>
               {(activeLesson.type === 'video' || activeLesson.type === 'recording') && (
                 <div className="w-full max-w-6xl mx-auto flex-shrink-0">
                   <EnhancedVideoPlayer src={activeLesson.content_url} />
                 </div>
               )}
             
             {activeLesson.type === 'pdf' && (
               <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl relative h-[80vh] flex-shrink-0 border border-neutral-800">
                 <iframe src={`${activeLesson.content_url}#toolbar=0`} className="w-full h-full bg-neutral-100" title="PDF Document" />
               </div>
             )}
             
             {activeLesson.type === 'image' && (
               <div className="w-full max-w-5xl mx-auto bg-neutral-900/50 rounded-2xl overflow-hidden shadow-2xl relative flex justify-center items-center p-4 border border-neutral-800">
                 <div className="relative w-full h-[60vh] md:h-[80vh]">
                    <Image 
                      src={activeLesson.content_url} 
                      alt={activeLesson.title} 
                      fill
                      className="object-contain rounded-lg shadow-lg select-none" 
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                      referrerPolicy="no-referrer"
                    />
                 </div>
               </div>
             )}
             
             {activeLesson.type === 'liveClass' && (
                <LiveClassWindow 
                  roomId={activeLesson.rtc_room_id} 
                  sessionId={activeLesson.sessionId}
                  onClose={() => setActiveLesson(null)} 
                />
             )}
             
             {activeLesson.type === 'live' && (
               <div className="w-full max-w-4xl mx-auto bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl relative border border-neutral-800 flex flex-col items-center justify-center p-12 text-center mt-10">
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse mb-8">
                    <MonitorPlay className="w-12 h-12 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white mb-3">लाइव क्लास वेटिंग रूम</h3>
                    <p className="text-neutral-400 max-w-md mx-auto text-lg">कक्षा Cloudflare रियल-टाइम किट के माध्यम से जुड़ती है। आपका रूम ID है:</p>
                    <div className="mt-6 bg-black border border-neutral-800 text-indigo-400 font-mono py-4 px-8 rounded-xl text-2xl select-all inline-block shadow-inner">
                      {activeLesson.content_url}
                    </div>
                  </div>
               </div>
             )}

             {activeLesson.type === 'article' && (
               <div className="w-full max-w-4xl mx-auto bg-white text-black p-8 md:p-12 rounded-2xl shadow-2xl xl:shadow-none min-h-[400px]">
                 <div className="prose prose-lg max-w-none prose-neutral" dangerouslySetInnerHTML={{ __html: activeLesson.text_content || '' }} />
               </div>
             )}
             
             {!activeLesson.content_url && activeLesson.type !== 'live' && activeLesson.type !== 'article' && (
               <div className="w-full max-w-6xl mx-auto bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center text-neutral-500 border border-neutral-800">
                 कोई मीडिया लिंक नहीं है।
               </div>
             )}
            
            <div className="w-full max-w-6xl mx-auto mt-8 flex justify-end flex-shrink-0 pb-10">
              <button 
                onClick={handleCompleteLesson}
                disabled={completedLessonIds.includes(activeLesson.id)}
                className={`py-3 px-6 rounded-xl font-medium transition-all flex items-center gap-2 ${completedLessonIds.includes(activeLesson.id) ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
              >
                <CheckCircle className="w-5 h-5" />
                {completedLessonIds.includes(activeLesson.id) ? 'पूर्ण हो गया' : 'पूर्ण हुआ चिह्नित करें'}
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {isTutorOpen && (
              <AITutor 
                lesson={activeLesson} 
                course={course} 
                isOpen={isTutorOpen} 
                onClose={() => setIsTutorOpen(false)} 
              />
            )}
          </AnimatePresence>
          </div>
        </div>
      )}
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
