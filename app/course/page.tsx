'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function CourseDetails() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/courses/${id}`)
      .then(res => res.json())
      .then((data: any) => {
        if (data.error) throw new Error(data.error);
        setCourse(data.course);
        setIsEnrolled(data.isEnrolled);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [id]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError('');
    try {
      const res = await fetch(`/api/courses/${id}/enroll`, { method: 'POST' });
      const data = await res.json() as any;
      
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }
        throw new Error(data.error || 'Failed to enroll');
      }
      
      setIsEnrolled(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (error && !course) return <div className="text-center py-20 text-red-400">{error}</div>;
  if (!course) return <div className="text-center py-20 text-neutral-400">Course not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-white mb-8 inline-flex items-center transition-colors">
        ← Back to Courses
      </Link>
      
      <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="h-64 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 relative">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/course/1200/400')] opacity-20 mix-blend-overlay bg-cover bg-center" />
        </div>
        
        <div className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{course.title}</h1>
              <p className="text-lg text-neutral-400 mt-4 leading-relaxed">{course.description}</p>
            </div>
            
            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 min-w-[280px] shrink-0">
              <div className="text-3xl font-bold text-white mb-6">
                ${(course.price / 100).toFixed(2)}
              </div>
              
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {isEnrolled ? (
                <div className="w-full py-3 px-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Enrolled
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-indigo-500/20"
                >
                  {isEnrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enroll Now'}
                </button>
              )}
              
              <p className="text-xs text-neutral-500 text-center mt-4">
                30-day money-back guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoursePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">LMS Portal</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">Courses</Link>
              <Link href="/auth/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Sign Out</Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
          <CourseDetails />
        </Suspense>
      </main>
    </div>
  );
}
