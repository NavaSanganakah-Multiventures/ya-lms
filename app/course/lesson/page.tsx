'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Lock, PlayCircle, ChevronLeft, FileText } from 'lucide-react';
import Link from 'next/link';

function LessonContent() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('id');
  const router = useRouter();

  const [lesson, setLesson] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lessonId) return;
    fetch(`/api/lessons/${lessonId}`)
      .then(res => res.json())
      .then((data: any) => {
        if (data.error && !data.lesson) throw new Error(data.error);
        setLesson(data.lesson);
        setCourse(data.course);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [lessonId]);

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
        <Lock className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white">Access Denied</h2>
      <p className="text-neutral-400">{error}</p>
      <button onClick={() => router.back()} className="text-indigo-400 hover:text-indigo-300 font-medium">
        ← Go Back
      </button>
    </div>
  );

  if (!lesson) return <div className="text-center py-20 text-neutral-500">Lesson not found</div>;

  // Sabhi videos Cloudflare R2 par hain — lesson.type se decide karo, URL se nahi
  const isVideo = lesson.type === 'video' || lesson.type === 'recording';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="text-sm text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Course
      </button>

      {/* Lesson Title */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-white tracking-tight">{lesson.title}</h1>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400">
          <span className="px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20 flex items-center gap-1">
            {lesson.type === 'video' ? <PlayCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {lesson.type}
          </span>
          {lesson.is_free === 1 && (
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 font-black">
              FREE PREVIEW
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      {lesson.content_url ? (
        <div className="aspect-video bg-black rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
          {isVideo ? (
            /**
             * Cloudflare R2 video — hamesha <video> tag use karo
             * <iframe> se video download ho jaati hai — kabhi mat use karo video ke liye
             */
            <video
              key={lesson.content_url}
              className="w-full h-full"
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
            >
              {/* Type hints help browsers decide codec support before fetching */}
              <source src={lesson.content_url} type="video/mp4" />
              <source src={lesson.content_url} type="video/webm" />
              <source src={lesson.content_url} />
              आपका browser video नहीं चला पा रहा। कृपया Chrome या Firefox use करें।
            </video>
          ) : (
            /* Non-video content (external doc, embed) — iframe */
            <iframe
              src={lesson.content_url}
              className="w-full h-full"
              allow="fullscreen"
              allowFullScreen
              title={lesson.title}
            />
          )}
        </div>
      ) : (
        /* No content_url — locked premium content */
        <div className="aspect-video bg-neutral-900 rounded-3xl border border-neutral-800 flex flex-col items-center justify-center space-y-4 p-8 text-center shadow-2xl">
          <Lock className="w-12 h-12 text-neutral-700" />
          <div className="space-y-2">
            <p className="text-white font-bold text-lg tracking-tight uppercase">Premium Content Locked</p>
            <p className="text-neutral-500 text-sm max-w-xs">
              Please upgrade your enrollment to access this premium lesson.
            </p>
          </div>
          <Link
            href={`/course?id=${lesson.course_id}`}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 text-sm"
          >
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Text / Notes Content */}
      {lesson.text_content && (
        <div className="bg-neutral-900 p-8 rounded-3xl border border-neutral-800 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Lesson Notes
          </h3>
          <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap prose prose-invert max-w-none">
            {lesson.text_content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LessonPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6 md:p-12">
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }>
        <LessonContent />
      </Suspense>
    </div>
  );
}
