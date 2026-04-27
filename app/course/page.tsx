'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Lock, PlayCircle, Eye, ChevronLeft, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';

function CourseDetails() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    
    Promise.all([
      fetch(`/api/courses/${id}`).then(res => res.json()),
      fetch(`/api/courses/${id}/lessons`).then(res => res.json())
    ]).then(([courseData, lessonData]: [any, any]) => {
      if (courseData.error) throw new Error(courseData.error);
      setCourse(courseData.course);
      setIsEnrolled(courseData.isEnrolled);
      setPaymentStatus(courseData.paymentStatus);
      setLessons(lessonData.lessons || []);
    }).catch(err => {
      console.error("Fetch Error:", err);
      setError(err.message);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [id]);

  const handleEnrollFree = async () => {
    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${id}/enroll`, { method: 'POST' });
      const data = await res.json() as any;
      if (res.ok) {
        setIsEnrolled(true);
        setPaymentStatus('unpaid');
        alert("नामांकन सफल! अब आप फ्री डेमो वीडियो देख सकते हैं।");
        // Re-fetch lessons to get updated access
        const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
        const lessonData = await lessonsRes.json() as any;
        setLessons(lessonData.lessons || []);
      } else {
        throw new Error(data.error || "Enrollment failed");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleBuyPremium = async () => {
    setIsEnrolling(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id })
      });
      
      const { order, key, error: orderError } = await res.json() as any;
      if (orderError) throw new Error(orderError);

      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: "Yagya Ashram",
        description: `Premium Access: ${course.title}`,
        order_id: order.id,
        handler: async (response: any) => {
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
            setPaymentStatus('paid');
            alert("भुगतान सफल! पूरा कोर्स अनलॉक कर दिया गया है।");
            const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
            const lessonData = await lessonsRes.json() as any;
            setLessons(lessonData.lessons || []);
          } else {
            alert("Verification failed.");
          }
        },
        theme: { color: "#4f46e5" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      <p className="text-neutral-500 font-medium animate-pulse">पाठ्यक्रम लोड हो रहा है...</p>
    </div>
  );

  if (error || !course) return (
    <div className="text-center py-32 bg-neutral-900/50 rounded-3xl border border-neutral-800 max-w-2xl mx-auto">
      <p className="text-red-400 font-medium">{error || "पाठ्यक्रम नहीं मिला"}</p>
      <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block font-bold">← वापस डैशबोर्ड पर जाएँ</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button onClick={() => router.push('/dashboard')} className="mb-8 text-neutral-400 hover:text-white flex items-center gap-2 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" /> कोर्सेस पर वापस जाएँ
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Course Info */}
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 overflow-hidden shadow-2xl relative">
            <div className="h-64 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 relative">
              <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/vedic/1200/600')] opacity-20 mix-blend-overlay bg-cover bg-center" />
              <div className="absolute bottom-8 left-8 right-8">
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full mb-3 inline-block uppercase tracking-widest shadow-lg shadow-indigo-500/20">Course Details</span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter">{course.title}</h1>
              </div>
            </div>
            <div className="p-8 md:p-12 space-y-6">
              <p className="text-lg md:text-xl text-neutral-300 leading-relaxed font-medium">{course.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <PlayCircle className="w-6 h-6 text-indigo-500" />
              पाठ्यक्रम सामग्री (Curriculum)
            </h2>
            <div className="grid gap-3">
              {lessons.map((lesson: any, idx: number) => {
                const canAccess = paymentStatus === 'paid' || (isEnrolled && lesson.is_free === 1);
                return (
                  <div key={lesson.id} className="group flex items-center justify-between p-5 bg-neutral-900 hover:bg-neutral-800/50 rounded-2xl border border-neutral-800 transition-all">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${canAccess ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                        {canAccess ? <PlayCircle className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-neutral-500">#{idx + 1}</span>
                           <h3 className="font-bold text-white text-lg">{lesson.title}</h3>
                           {lesson.is_free === 1 && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded border border-emerald-500/20">FREE</span>}
                         </div>
                         <p className="text-xs text-neutral-500 uppercase font-black tracking-widest mt-1">{lesson.type}</p>
                      </div>
                    </div>
                    {canAccess ? (
                      <Link href={`/course/lesson?id=${lesson.id}`} className="px-6 py-2.5 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-xl text-sm font-black transition-all shadow-xl">
                        अभी देखें
                      </Link>
                    ) : (
                      <div className="text-right">
                        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                          <Lock className="w-3 h-3" /> लॉक है
                        </div>
                        <p className="text-[9px] text-indigo-400/80 font-bold mt-1">
                          {!isEnrolled ? 'Enroll to Preview' : 'Unlock Premium'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl lg:sticky lg:top-24">
            <div className="mb-6">
              <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-1">कोर्स की कीमत</div>
              <div className="text-5xl font-black text-white tracking-tighter">
                ₹{course.price_inr || (course.price ? course.price / 100 : '0')}
              </div>
            </div>

            <div className="space-y-4">
              {!isEnrolled ? (
                <button
                  onClick={handleEnrollFree}
                  disabled={isEnrolling}
                  id="enroll-button-main"
                  className="w-full py-4 bg-white text-black hover:bg-indigo-600 hover:text-white rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isEnrolling ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      अभी फ्री नामांकन करें
                    </>
                  )}
                </button>
              ) : (
                paymentStatus !== 'paid' ? (
                  <button
                    onClick={handleBuyPremium}
                    disabled={isEnrolling}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    {isEnrolling ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        प्रीमियम अनलॉक करें
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-black flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-6 h-6" />
                    प्रीमियम सक्रिय है
                  </div>
                )
              )}
              
              <div className="pt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>आजीवन एक्सेस (Lifetime)</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-neutral-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>मोबाइल और डेस्कटॉप पर देखें</span>
                </div>
              </div>
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
      <main className="max-w-7xl mx-auto px-4 py-12">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-neutral-500 font-medium animate-pulse">लोड हो रहा है...</p>
          </div>
        }>
          <CourseDetails />
        </Suspense>
      </main>
    </div>
  );
}
