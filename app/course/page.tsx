'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, Lock, PlayCircle, Eye } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

function CourseDetails() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/courses/${id}`).then(res => res.json()),
      fetch(`/api/courses/${id}/lessons`).then(res => res.json())
    ]).then(([courseData, lessonData]: [any, any]) => {
      if (courseData.error) throw new Error(courseData.error);
      setCourse(courseData.course);
      setIsEnrolled(courseData.isEnrolled);
      setLessons(lessonData.lessons || []);
      setIsLoading(false);
    }).catch(err => {
      setError(err.message);
      setIsLoading(false);
    });
  }, [id]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError('');
    try {
      // 1. Create Razorpay Order
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id })
      });
      
      const { order, key, error: orderError } = await res.json() as any;
      if (orderError) throw new Error(orderError);

      // 2. Open Razorpay Modal
      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: "Yagya Ashram LMS",
        description: `Enrollment for ${course.title}`,
        order_id: order.id,
        handler: async (response: any) => {
          // 3. Verify Payment
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (verifyRes.ok) {
            setIsEnrolled(true);
            alert("Payment successful! You are now enrolled.");
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          email: "student@example.com", // Ideally from user profile
        },
        theme: { color: "#4f46e5" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

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
                ₹{course.price_inr || course.price / 100}
              </div>
              
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
                  {isEnrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy Now'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-12 border-t border-neutral-800 pt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Course Content</h2>
            <div className="space-y-3">
              {lessons.map((lesson: any) => (
                <div key={lesson.id} className="flex items-center justify-between p-4 bg-neutral-950/50 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center text-neutral-400 group-hover:text-indigo-400 transition-colors">
                      {lesson.is_free === 1 ? <Eye className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{lesson.title}</h3>
                      <p className="text-xs text-neutral-500 uppercase">{lesson.type}</p>
                    </div>
                  </div>
                  {(isEnrolled || lesson.is_free === 1) ? (
                    <Link href={`/course/lesson?id=${lesson.id}`} className="px-4 py-2 bg-neutral-800 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2">
                      <PlayCircle className="w-4 h-4" />
                      {lesson.is_free === 1 && !isEnrolled ? 'Free Preview' : 'Start Lesson'}
                    </Link>
                  ) : (
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Locked
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
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
