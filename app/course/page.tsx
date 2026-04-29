'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Lock, PlayCircle, ChevronLeft, CreditCard, Sparkles, Crown, Zap, Calendar, RefreshCw } from 'lucide-react';
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
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'onetime' | 'subscription'>('onetime');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      fetch(`/api/courses/${id}`).then(r => r.json()),
      fetch(`/api/courses/${id}/lessons`).then(r => r.json()),
      fetch('/api/subscription/me').then(r => r.json()).catch(() => ({ subscription: null })),
      fetch('/api/subscription/plans').then(r => r.json()).catch(() => ({ plans: [] }))
    ]).then(([courseData, lessonData, subData, plansData]: [any, any, any, any]) => {
      if (courseData.error) throw new Error(courseData.error);
      setCourse(courseData.course);
      setIsEnrolled(courseData.isEnrolled);
      setPaymentStatus(courseData.paymentStatus);
      setLessons(lessonData.lessons || []);
      const activeSub = subData?.subscription?.status === 'active';
      setHasSubscription(activeSub);
      setSubscriptionPlans(plansData?.plans || []);
    }).catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isPremiumUnlocked = paymentStatus === 'paid' || hasSubscription;

  const handleEnrollFree = async () => {
    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${id}/enroll`, { method: 'POST' });
      const data = await res.json() as any;
      if (res.ok) {
        setIsEnrolled(true);
        setPaymentStatus('unpaid');
        const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
        const lessonData = await lessonsRes.json() as any;
        setLessons(lessonData.lessons || []);
      } else throw new Error(data.error || 'Enrollment failed');
    } catch (err: any) { alert(err.message); }
    finally { setIsEnrolling(false); }
  };

  const handleBuyPremium = async () => {
    setIsEnrolling(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id })
      });
      const { order, key, error: orderError, code } = await res.json() as any;
      if (code === 'PAYMENT_NOT_CONFIGURED') {
        alert('भुगतान गेटवे अभी सेटअप नहीं है। कृपया व्यवस्थापक से संपर्क करें।');
        return;
      }
      if (orderError) throw new Error(orderError);

      const options = {
        key, amount: order.amount, currency: order.currency,
        name: 'Yagya Ashram', description: `Premium: ${course.title}`, order_id: order.id,
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          if (verifyRes.ok) {
            setPaymentStatus('paid');
            const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
            const ld = await lessonsRes.json() as any;
            setLessons(ld.lessons || []);
            alert('भुगतान सफल! पूरा कोर्स अनलॉक हो गया है। 🎉');
          } else alert('Verification failed. Please contact support.');
        },
        theme: { color: '#4f46e5' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) { alert(err.message); }
    finally { setIsEnrolling(false); }
  };

  const handleSubscribe = async (planId: string) => {
    setIsEnrolling(true);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json() as any;
      if (data.code === 'PAYMENT_NOT_CONFIGURED') { alert('Payment gateway not configured.'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to create subscription');

      const options = {
        key: data.key,
        subscription_id: data.subscription_id,
        name: 'Yagya Ashram',
        description: `${data.plan.name} Subscription — सभी कोर्स एक्सेस`,
        prefill: { email: data.user?.email, name: data.user?.name },
        handler: () => {
          setHasSubscription(true);
          alert('सब्सक्रिप्शन सक्रिय! अब सभी कोर्स देखें। 🎉');
          router.push('/dashboard/subscription');
        },
        theme: { color: '#7c3aed' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) { alert(err.message); }
    finally { setIsEnrolling(false); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      <p className="text-neutral-500 font-medium animate-pulse">पाठ्यक्रम लोड हो रहा है...</p>
    </div>
  );

  if (error || !course) return (
    <div className="text-center py-32 bg-neutral-900/50 rounded-3xl border border-neutral-800 max-w-2xl mx-auto">
      <p className="text-red-400 font-medium">{error || 'पाठ्यक्रम नहीं मिला'}</p>
      <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block font-bold">← वापस डैशबोर्ड पर जाएँ</Link>
    </div>
  );

  const intervalLabel: Record<string, string> = { monthly: '/माह', quarterly: '/तिमाही', yearly: '/वर्ष' };

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
              <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center" style={{backgroundImage:"url('https://picsum.photos/seed/vedic/1200/600')"}} />
              <div className="absolute bottom-8 left-8 right-8">
                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full mb-3 inline-block uppercase tracking-widest">Course Details</span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter">{course.title}</h1>
              </div>
            </div>
            <div className="p-8 md:p-12 space-y-6">
              <p className="text-lg md:text-xl text-neutral-300 leading-relaxed font-medium">{course.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <PlayCircle className="w-6 h-6 text-indigo-500" /> पाठ्यक्रम सामग्री (Curriculum)
            </h2>
            <div className="grid gap-3">
              {lessons.map((lesson: any, idx: number) => {
                const canAccess = isPremiumUnlocked || (isEnrolled && lesson.is_free === 1);
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
                      <Link href={`/dashboard/course?id=${course.id}&lessonId=${lesson.id}`} className="px-6 py-2.5 bg-white text-black hover:bg-indigo-500 hover:text-white rounded-xl text-sm font-black transition-all shadow-xl">
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
          <div className="bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl lg:sticky lg:top-24 space-y-6">

            {/* Active State / Enrolled State */}
            {isPremiumUnlocked ? (
              <div className="space-y-4">
                <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  {hasSubscription ? 'सब्सक्रिप्शन सक्रिय है' : 'प्रीमियम सक्रिय है'}
                </div>
                <Link href={`/dashboard/course?id=${course.id}`} className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/30 hover:scale-[1.02]">
                  <PlayCircle className="w-6 h-6" /> कोर्स डैशबोर्ड पर जाएँ
                </Link>
                {hasSubscription && (
                  <Link href="/dashboard/subscription" className="block w-full py-3 text-center bg-violet-600/20 border border-violet-500/30 text-violet-400 rounded-2xl text-sm font-bold hover:bg-violet-600/30 transition-all">
                    <RefreshCw className="w-4 h-4 inline mr-2" /> सब्सक्रिप्शन प्रबंधित करें
                  </Link>
                )}
              </div>
            ) : isEnrolled ? (
              <div className="space-y-4">
                <div className="w-full py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl font-black flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  कोर्स में नामांकित (फ्री एक्सेस)
                </div>
                <Link href={`/dashboard/course?id=${course.id}`} className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/30 hover:scale-[1.02]">
                  <PlayCircle className="w-6 h-6" /> कोर्स डैशबोर्ड पर जाएँ
                </Link>
                
                {paymentStatus !== 'paid' && course.price_inr > 0 && (
                  <div className="pt-4 border-t border-neutral-800 mt-4">
                    <p className="text-xs text-neutral-500 font-bold mb-3 uppercase tracking-wider text-center">प्रीमियम अनलॉक करें</p>
                    <button onClick={handleBuyPremium} disabled={isEnrolling}
                      className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      {isEnrolling ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Crown className="w-4 h-4 text-amber-400" /> प्रीमियम खरीदें ₹{course.price_inr}</>}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Price Header */}
                <div>
                  <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-1">कोर्स की कीमत</div>
                  <div className="text-5xl font-black text-white tracking-tighter">
                    ₹{course.price_inr || (course.price ? course.price / 100 : '0')}
                  </div>
                </div>

                {/* Tab Selector */}
                <div className="flex rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                  <button
                    onClick={() => setPaymentTab('onetime')}
                    className={`flex-1 py-2.5 text-sm font-black transition-all ${paymentTab === 'onetime' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <CreditCard className="w-4 h-4 inline mr-1" /> एक बार खरीदें
                  </button>
                  <button
                    onClick={() => setPaymentTab('subscription')}
                    className={`flex-1 py-2.5 text-sm font-black transition-all ${paymentTab === 'subscription' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <Crown className="w-4 h-4 inline mr-1" /> सब्सक्राइब करें
                  </button>
                </div>

                {/* One-Time Tab */}
                {paymentTab === 'onetime' && (
                  <div className="space-y-3">
                    {!isEnrolled && (
                      <button onClick={handleEnrollFree} disabled={isEnrolling} id="enroll-button-main"
                        className="w-full py-4 bg-white text-black hover:bg-indigo-600 hover:text-white rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {isEnrolling ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-5 h-5" /> फ्री नामांकन करें</>}
                      </button>
                    )}
                    <div className="pt-2 space-y-3">
                      {['आजीवन एक्सेस (Lifetime)', 'मोबाइल और डेस्कटॉप पर देखें', 'सर्टिफिकेट'].map(f => (
                        <div key={f} className="flex items-center gap-3 text-sm text-neutral-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subscription Tab */}
                {paymentTab === 'subscription' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Zap className="w-5 h-5 text-violet-400 shrink-0" />
                      <p className="text-xs text-violet-300 font-bold">सब्सक्रिप्शन से <span className="text-violet-100">सभी कोर्स</span> एक्सेस करें!</p>
                    </div>
                    {subscriptionPlans.length === 0 ? (
                      <p className="text-center text-neutral-500 text-sm py-4">अभी कोई प्लान उपलब्ध नहीं है।</p>
                    ) : (
                      subscriptionPlans.map((plan: any) => (
                        <div key={plan.id} className="p-4 rounded-2xl border border-neutral-700 bg-neutral-800/50 hover:border-violet-500/50 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-violet-400" />
                                <span className="font-black text-white">{plan.name}</span>
                              </div>
                              <div className="text-2xl font-black text-violet-300 mt-1">
                                ₹{Math.round(plan.amount_inr / 100)}<span className="text-sm font-bold text-neutral-500">{intervalLabel[plan.interval] || ''}</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleSubscribe(plan.id)} disabled={isEnrolling}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                            {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4" /> अभी सब्सक्राइब करें</>}
                          </button>
                        </div>
                      ))
                    )}
                    <div className="pt-2 space-y-2">
                      {['सभी कोर्स अनलॉक', 'नए कोर्स तुरंत एक्सेस', 'कभी भी रद्द करें'].map(f => (
                        <div key={f} className="flex items-center gap-3 text-sm text-neutral-400">
                          <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" /><span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
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
