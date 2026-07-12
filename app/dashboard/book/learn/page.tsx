'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlayCircle, FileText, MonitorPlay, CheckCircle, Image as ImageIcon, X, Edit3, Sparkles, Wifi, Lock, BookOpen, Monitor, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import EnhancedVideoPlayer from '@/components/EnhancedVideoPlayer';

function BookLearnPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const lessonIdParam = searchParams.get('lessonId');
  const [book, setBook] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'recordings'>('all');

  const { groupedRecordings } = React.useMemo(() => {
    const recordingLessons = lessons.filter(l => l.type === 'recording');
    const batchMap = new Map(batches.map((b: any) => [b.id, b.name_hi || b.name]));
    const grouped: Record<string, any[]> = {};
    recordingLessons.forEach((l: any) => {
      const name = l.batch_id ? (batchMap.get(l.batch_id) || `Batch ${l.batch_id.slice(0, 8)}`) : 'General';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(l);
    });

    Object.keys(grouped).forEach(batchName => {
      grouped[batchName].sort((a: any, b: any) => a.order_index - b.order_index);
    });

    return { groupedRecordings: grouped };
  }, [lessons, batches]);
  const [DOMPurify, setDOMPurify] = useState<any>(null);
  const [isDOMPurifyReady, setIsDOMPurifyReady] = useState(false);
  const [chapters, setChapters] = useState<any>({});

  useEffect(() => {
    import('isomorphic-dompurify').then((mod) => {
      setDOMPurify(() => mod.default);
      setIsDOMPurifyReady(true);
    });
  }, []);

  const sanitize = (html: string): string => {
    if (!isDOMPurifyReady || !DOMPurify) return '';
    return DOMPurify.sanitize(html);
  };

  const linkedCourseIdRef = useRef<string | null>(null);
  const bookIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bookRes, batchRes] = await Promise.all([
        fetch(`/api/books/${id}`),
        fetch(`/api/books/${id}/batches`),
      ]);
      if (bookRes.ok) {
        const data = await bookRes.json() as any;
        setBook(data.book);
        linkedCourseIdRef.current = data.courses?.[0]?.id || null;
        bookIdRef.current = id || null;
        setIsEnrolled(data.isEnrolled || false);
        setPaymentStatus(data.paymentStatus || null);
        setCompletedLessonIds(data.completedLessonIds || []);
        
        if (batchRes.ok) {
          const batchData = await batchRes.json() as any;
          setBatches(batchData.batches || []);
        }

        const fetchedLessons = data.lessons || [];
        setLessons(fetchedLessons);

        const newChapters = fetchedLessons.reduce((acc: any, lesson: any) => {
          const chap = lesson.chapter_title || 'General';
          if (!acc[chap]) acc[chap] = [];
          acc[chap].push(lesson);
          return acc;
        }, {});
        setChapters(newChapters);

        const initialLessonId = lessonIdParam;
        if (initialLessonId && fetchedLessons.length > 0) {
          const targetLesson = fetchedLessons.find((l: any) => l.id === initialLessonId);
          if (targetLesson) setActiveLesson(targetLesson);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, lessonIdParam]);

  useEffect(() => { if (id) fetchData(); }, [id, fetchData]);

  const handleCompleteLesson = useCallback(async (lessonId: string) => {
    if (!lessonId || completedLessonIds.includes(lessonId)) return;
    try {
      const courseId = linkedCourseIdRef.current;
      let ok = false;
      if (courseId) {
        const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' });
        ok = res.ok;
      }
      if (!ok && bookIdRef.current) {
        await fetch(`/api/books/${bookIdRef.current}/lessons/${lessonId}/complete`, { method: 'POST' });
      }
      setCompletedLessonIds(prev => {
        if (prev.includes(lessonId)) return prev;
        return [...prev, lessonId];
      });
    } catch (err) {}
  }, [completedLessonIds]);

  useEffect(() => {
    if (!activeLesson || completedLessonIds.includes(activeLesson.id)) return;
    if (activeLesson.type !== 'video' && activeLesson.type !== 'recording') {
      const timer = setTimeout(() => {
        handleCompleteLesson(activeLesson.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeLesson, completedLessonIds, id, handleCompleteLesson]);

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-5 h-5 text-amber-400" />;
      case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-blue-400" />;
      case 'article': return <Edit3 className="w-5 h-5 text-yellow-400" />;
      default: return <FileText className="w-5 h-5 text-neutral-400" />;
    }
  };

  const isPremiumUnlocked = paymentStatus === 'paid' || (book && (book.price_rupees === 0 || book.price_rupees === null));

  const canAccessLesson = (lesson: any) => {
    if (isPremiumUnlocked) return true;
    if (isEnrolled && lesson.is_free === 1) return true;
    return false;
  };

  if (loading) return <div className="p-8 text-neutral-400 text-center animate-pulse">Loading...</div>;
  if (!book) return <div className="p-8 text-neutral-400 text-center">Book not found.</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[85vh] animate-in fade-in duration-700 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {!activeLesson ? (
          // Welcome screen
          <div className="p-8 md:p-12 flex flex-col h-full">
            <Link href={`/dashboard`} className="inline-flex items-center text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors w-fit mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <div className="flex gap-6 mb-8">
               {book.thumbnail_url && (
                  <Image src={book.thumbnail_url} alt={book.title} width={128} height={170} className="w-32 h-auto aspect-[3/4] object-cover rounded-xl shadow-lg border border-neutral-800 hidden sm:block" />
               )}
               <div>
                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3 flex items-center gap-3">
                     <BookOpen className="w-8 h-8 text-amber-500" /> {book.title}
                  </h1>
                  <p className="text-neutral-400 leading-relaxed max-w-3xl">{book.description}</p>
               </div>
            </div>

            {/* Progress */}
            <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-800/50 mb-8 mt-auto">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-neutral-400">Progress</span>
                <span className="text-sm font-black text-emerald-400">
                  {completedLessonIds.length}/{lessons.length} Completed
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${lessons.length === 0 ? 0 : Math.round((completedLessonIds.length / lessons.length) * 100)}%` }}
                />
              </div>
            </div>

            {/* Access warning */}
            {!isPremiumUnlocked && isEnrolled && book.price_rupees > 0 && (
              <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-amber-400 font-bold">⚠ Free Preview Mode</p>
                  <p className="text-neutral-400 text-sm mt-1">You can only view free lessons. Buy the full book to unlock all content.</p>
                </div>
                <Link href={`/book?id=${id}`} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm whitespace-nowrap">
                  Buy Book
                </Link>
              </div>
            )}

            {lessons.length > 0 ? (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const firstAccessible = lessons.find(l => canAccessLesson(l));
                    if (firstAccessible) setActiveLesson(firstAccessible);
                  }}
                  className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-500/30 flex items-center gap-3 transition-all hover:scale-[1.02]"
                >
                  <BookOpen className="w-6 h-6" /> Start Reading
                </button>
              </div>
            ) : (
              <p className="text-neutral-500 text-center">No content available.</p>
            )}
          </div>
        ) : (
          // Lesson player
          <div className="flex flex-col h-full relative">
            <div className="h-16 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setActiveLesson(null)} className="text-neutral-500 hover:text-white transition-colors mr-2" aria-label="Back to course" title="Back to course">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="p-1.5 bg-neutral-900 rounded-lg border border-neutral-800 shrink-0">
                  {getLessonIcon(activeLesson.type)}
                </div>
                <h2 className="text-sm md:text-base font-bold text-white truncate">{activeLesson.title}</h2>
              </div>
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
                  <div className="relative w-full h-full max-h-[70dvh]">
                    <Image src={activeLesson.content_url} alt={activeLesson.title} fill
                      className="object-contain rounded-lg select-none"
                      onContextMenu={(e) => e.preventDefault()} draggable={false} referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}
              {activeLesson.type === 'article' && (
                <div className="w-full h-full bg-white text-black p-8 md:p-12 overflow-y-auto">
                  {!isDOMPurifyReady ? (
                    <div className="flex items-center justify-center h-full text-neutral-400">
                      <span className="animate-pulse">Loading...</span>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto prose ppink-lg ppink-neutral" dangerouslySetInnerHTML={{ __html: sanitize(activeLesson.text_content || '') }} />
                  )}
                </div>
              )}
              {!activeLesson.content_url && activeLesson.type !== 'article' && (
                <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-950">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8 text-neutral-700" />
                    </div>
                    <p>No media link found.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="h-20 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                {(() => {
                  const accessibleLessons = lessons.filter(l => canAccessLesson(l));
                  const currentIndex = accessibleLessons.findIndex(l => l.id === activeLesson.id);
                  const prev = currentIndex > 0 ? accessibleLessons[currentIndex - 1] : null;
                  const next = currentIndex < accessibleLessons.length - 1 ? accessibleLessons[currentIndex + 1] : null;
                  return (
                    <>
                      <button onClick={() => prev && setActiveLesson(prev)} disabled={!prev}
                        className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all">
                        Previous
                      </button>
                      <button onClick={() => next && setActiveLesson(next)} disabled={!next}
                        className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all">
                        Next
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Curriculum */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl lg:h-[85vh]">
        <div className="p-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-white">Table of Contents</h3>
            <Link href={`/book?id=${id}`} className="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md flex items-center gap-1">
              <FileText className="w-3 h-3" /> Details
            </Link>
          </div>
          <div className="flex gap-1 mt-2">
            <button onClick={() => setActiveTab('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === 'all' ? 'bg-amber-500/20 text-amber-400' : 'text-neutral-500 hover:text-white'}`}>
              सभी
            </button>
            <button onClick={() => setActiveTab('recordings')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${activeTab === 'recordings' ? 'bg-amber-500/20 text-amber-400' : 'text-neutral-500 hover:text-white'}`}>
              <Monitor className="w-3 h-3" /> रिकॉर्डिंग
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'recordings' ? (
            Object.keys(groupedRecordings).length === 0 ? (
              <div className="text-neutral-500 p-8 text-center text-sm">No recordings available.</div>
            ) : (
              Object.keys(groupedRecordings).map((batchName) => (
                <div key={batchName} className="border-b border-neutral-800/50">
                  <div className="bg-indigo-950/30 px-4 py-2.5 border-y border-neutral-800/50 sticky top-0 z-10 backdrop-blur-md flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{batchName}</h4>
                  </div>
                  <div className="divide-y divide-neutral-800/30">
                    {groupedRecordings[batchName].map((lesson: any) => {
                      const isCompleted = completedLessonIds.includes(lesson.id);
                      const isActive = activeLesson?.id === lesson.id;
                      const accessible = canAccessLesson(lesson);
                      return (
                        <button key={lesson.id} disabled={!accessible} onClick={() => setActiveLesson(lesson)}
                          className={`w-full text-left p-3 transition-colors group flex gap-3 ${!accessible ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800/50'} ${isActive ? 'bg-amber-500/10' : ''}`}>
                          <div className="shrink-0 mt-0.5">
                            {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                              : isActive ? <div className="w-4 h-4 rounded-full border-2 border-amber-500 animate-pulse bg-amber-500/20" />
                              : !accessible ? <Lock className="w-4 h-4 text-neutral-600" />
                              : <MonitorPlay className="w-4 h-4 text-indigo-400" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium leading-snug truncate ${isActive ? 'text-amber-300 font-bold' : isCompleted ? 'text-neutral-400' : accessible ? 'text-neutral-300' : 'text-neutral-600'}`}>
                              {lesson.title}
                            </p>
                            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-400/60">Recording</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )
          ) : (
            Object.keys(chapters).length === 0 ? (
              <div className="text-neutral-500 p-8 text-center text-sm">No contents available.</div>
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
                          className={`w-full text-left p-3 transition-colors group flex gap-3 ${!accessible ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800/50'} ${isActive ? 'bg-amber-500/10' : ''}`}>
                          <div className="shrink-0 mt-0.5">
                            {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                              : isActive ? <div className="w-4 h-4 rounded-full border-2 border-amber-500 animate-pulse bg-amber-500/20" />
                              : !accessible ? <Lock className="w-4 h-4 text-neutral-600" />
                              : <div className="w-4 h-4 text-neutral-500">{getLessonIcon(lesson.type)}</div>
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium leading-snug truncate ${isActive ? 'text-amber-300 font-bold' : isCompleted ? 'text-neutral-400' : accessible ? 'text-neutral-300' : 'text-neutral-600'}`}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">{lesson.type}</span>
                              {lesson.is_free === 1 && <span className="text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1 rounded">Free</span>}
                              {!accessible && <span className="text-[9px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1 rounded">Locked</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookLearnPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400 text-center animate-pulse">Loading...</div>}>
      <BookLearnPageContent />
    </Suspense>
  );
}
