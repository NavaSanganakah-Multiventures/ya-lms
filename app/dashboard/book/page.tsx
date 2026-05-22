'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, CheckCircle, Loader2, Lock, PlayCircle, FileText, MonitorPlay,
  Image as ImageIcon, Clock
} from 'lucide-react';

function BookDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [book, setBook] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/books/${id}`);
        if (!res.ok) {
          if (res.status === 404) { setBook(null); return; }
          throw new Error(`Failed: ${res.status}`);
        }
        const data: any = await res.json();
        setBook(data.book);
        setLessons(data.lessons || []);
        setCompletedLessonIds(data.completedLessonIds || []);
        setIsEnrolled(data.isEnrolled || false);
        setPaymentStatus(data.paymentStatus || null);
      } catch (err: any) {
        setError('डेटा लोड करने में त्रुटि। कृपया पुनः प्रयास करें।');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const progress = lessons.length > 0
    ? Math.round((completedLessonIds.length / lessons.length) * 100)
    : 0;

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
  );

  if (error) return (
    <div className="py-20 text-center text-red-400">{error}</div>
  );

  if (!book) return (
    <div className="py-20 text-center text-neutral-500">Book not found</div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back + header */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>

        <div className="flex items-start gap-6">
          <div className="p-4 bg-amber-500/10 rounded-2xl flex-shrink-0">
            <BookOpen className="w-10 h-10 text-amber-500" />
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold text-white">{book.title}</h1>
            {book.description && <p className="text-neutral-400">{book.description}</p>}
          </div>
        </div>

        {/* Progress bar */}
        {isEnrolled && lessons.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400 font-medium">Progress</span>
              <span className="text-amber-400 font-bold">{progress}%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-neutral-500">{completedLessonIds.length} of {lessons.length} lessons completed</p>
          </div>
        )}

        {/* Lesson list */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-orange-400" /> Lessons
          </h2>
          {lessons.length === 0 ? (
            <p className="text-neutral-500 text-sm">No lessons in this book yet.</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson: any) => {
                const isCompleted = completedLessonIds.includes(lesson.id);
                const isLocked = !isEnrolled && lesson.is_free !== 1;
                return (
                  <Link
                    key={lesson.id}
                    href={isLocked ? '#' : `/dashboard/book/learn?id=${id}&lessonId=${lesson.id}`}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : isLocked
                          ? 'bg-neutral-900/50 border-neutral-800/50 opacity-60'
                          : 'bg-neutral-900 border-neutral-800 hover:border-orange-500/30'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isCompleted ? 'bg-emerald-500/10 text-emerald-400' :
                      isLocked ? 'bg-neutral-800 text-neutral-600' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> :
                       isLocked ? <Lock className="w-5 h-5" /> :
                       lesson.type === 'video' || lesson.type === 'recording' ? <PlayCircle className="w-5 h-5" /> :
                       lesson.type === 'image' ? <ImageIcon className="w-5 h-5" /> :
                       <FileText className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">{lesson.type}</span>
                        {lesson.is_free === 1 && <span className="text-[10px] font-bold text-emerald-400">FREE</span>}
                      </div>
                    </div>
                    {!isLocked && <PlayCircle className="w-5 h-5 text-neutral-500 group-hover:text-orange-400 transition-colors flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <BookDetailContent />
    </Suspense>
  );
}
