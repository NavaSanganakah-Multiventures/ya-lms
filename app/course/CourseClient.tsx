'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {  Loader2, CheckCircle2, Lock, PlayCircle, ChevronLeft, CreditCard, Sparkles, Crown, Zap, Calendar, RefreshCw, Coins, Wallet, BookOpen, Video, X, ExternalLink, CheckCircle } from "lucide-react";
import Link from 'next/link';
import Script from 'next/script';
import CheckoutPanel, { CheckoutBillingAddress, CheckoutQuote } from '@/components/CheckoutPanel';
import { useToast } from '@/contexts/ToastContext';
import { useCredits } from '@/contexts/CreditsContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CourseClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { credits, setCredits, refreshCredits } = useCredits();
  const { t } = useLanguage();

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(searchParams.get('bookId') || null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [selfStudyCredits, setSelfStudyCredits] = useState<any>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'onetime' | 'subscription'>('onetime');
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialUpgradePrice, setTrialUpgradePrice] = useState<number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const loadCourseData = async () => {
      setIsLoading(true);
      try {
        const [courseData, lessonData, bookData, plansData]: [any, any, any, any] = await Promise.all([
          fetch(`/api/courses/${id}`).then(r => r.json()),
          fetch(`/api/courses/${id}/lessons`).then(r => r.json()),
          fetch(`/api/courses/${id}/books`).then(r => r.json()),
          fetch('/api/subscription/plans').then(r => r.json()).catch(() => ({ plans: [] }))
        ]);
        if (courseData.error) throw new Error(courseData.error);
        setCourse(courseData.course);
        setIsEnrolled(courseData.isEnrolled);
        setPaymentStatus(courseData.paymentStatus ?? lessonData.paymentStatus ?? null);
        setSelfStudyCredits(courseData.selfStudyCredits || null);
        setLessons(lessonData.lessons || []);

        if (lessonData.trialExpired) {
          setTrialExpired(true);
          setTrialUpgradePrice(lessonData.trialUpgradePrice);
        }
        setBooks(bookData.books || []);
        const hasCourseSubscriptionAccess = Boolean(courseData.subscriptionCourseAccess || lessonData.subscriptionCourseAccess);
        setHasSubscription(hasCourseSubscriptionAccess);
        setSubscriptionPlans(plansData?.plans || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadCourseData();
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
        const booksRes = await fetch(`/api/courses/${id}/books`);
        const bookData = await booksRes.json() as any;
        setBooks(bookData.books || []);
        const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
        const lessonData = await lessonsRes.json() as any;
        setLessons(lessonData.lessons || []);
        setBooks(bookData.books || []);
      } else throw new Error(data.error || 'Enrollment failed');
    } catch (err: any) { showError(err.message); }
    finally { setIsEnrolling(false); }
  };

  const handleBuyPremium = async (checkout?: { couponCode?: string; billingAddress?: CheckoutBillingAddress; quote?: CheckoutQuote | null }) => {
    setIsEnrolling(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id, couponCode: checkout?.couponCode, billingAddress: checkout?.billingAddress })
      });
      const { order, key, error: orderError, code, freeCheckout } = await res.json() as any;
      if (code === 'PAYMENT_NOT_CONFIGURED') {
        showError('भुगतान गेटवे अभी सेटअप नहीं है। कृपया व्यवस्थापक से संपर्क करें।');
        return;
      }
      if (orderError) throw new Error(orderError);
      if (freeCheckout) {
        setPaymentStatus('paid');
        setIsEnrolled(true);
        const booksRes = await fetch(`/api/courses/${id}/books`);
        const bookData = await booksRes.json() as any;
        setBooks(bookData.books || []);
        const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
        const ld = await lessonsRes.json() as any;
        setLessons(ld.lessons || []);
        showSuccess('Coupon apply ho gaya! Course unlock ho gaya hai। 🎉');
        return;
      }

      const options = {
        key, amount: order.amount, currency: order.currency,
        name: 'Yagya Ashram', description: `Premium: ${course.title}`, order_id: order.id,
        prefill: {
          email: checkout?.billingAddress?.email || '',
          contact: checkout?.billingAddress?.phone || '',
        },
        handler: async (response: any) => {
          try {
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
              const booksRes = await fetch(`/api/courses/${id}/books`);
              const bookData = await booksRes.json() as any;
              setBooks(bookData.books || []);
              const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
              const ld = await lessonsRes.json() as any;
              setLessons(ld.lessons || []);
              showSuccess('भुगतान सफल! पूरा कोर्स अनलॉक हो गया है। 🎉');
            } else showError('Verification failed. Please contact support with payment ID: ' + response.razorpay_payment_id);
          } catch (err) {
            showError('Network error during verification. Please contact support with payment ID: ' + response.razorpay_payment_id);
          }
        },
        theme: { color: '#4f46e5' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) { showError(err.message); }
    finally { setIsEnrolling(false); }
  };

  const handleUnlockWithCredits = async () => {
    if (!id) return;
    setIsEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${id}/enroll-with-credits`, { method: 'POST' });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Credit unlock failed');

      if (data.selfStudyCredits && data.selfStudyCredits.balance != null) {
        setCredits(data.selfStudyCredits.balance);
      } else {
        refreshCredits();
      }

      const booksRes = await fetch(`/api/courses/${id}/books`);
      const bookData = await booksRes.json() as any;
      setBooks(bookData.books || []);
      const lessonsRes = await fetch(`/api/courses/${id}/lessons`);
      const lessonData = await lessonsRes.json() as any;
      setLessons(lessonData.lessons || []);

      setIsEnrolled(true);
      setPaymentStatus(data.paymentStatus || 'paid');
      setSelfStudyCredits(data.selfStudyCredits || selfStudyCredits);
      showSuccess('Credits से course unlock हो गया है। 🎉');
    } catch (err: any) { showError(err.message); }
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
      if (data.code === 'PAYMENT_NOT_CONFIGURED') { showError('Payment gateway not configured.'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to create subscription');

      const options = {
        key: data.key,
        subscription_id: data.subscription_id,
        name: 'Yagya Ashram',
        description: `${data.plan.name} Subscription — सभी कोर्स एक्सेस`,
        prefill: { email: data.user?.email, contact: data.user?.phone, name: data.user?.name },
        handler: () => {
          setHasSubscription(true);
          showSuccess('सब्सक्रिप्शन सक्रिय! अब सभी कोर्स देखें। 🎉');
          router.push('/dashboard/subscription');
        },
        theme: { color: '#7c3aed' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) { showError(err.message); }
    finally { setIsEnrolling(false); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      <p className="text-neutral-500 font-medium animate-pulse">{t('common.loading')}</p>
    </div>
  );

  if (error || !course) return (
    <div className="text-center py-32 bg-neutral-900/50 rounded-3xl border border-neutral-800 max-w-2xl mx-auto">
      <p className="text-red-400 font-medium">{error || t('course.not_found')}</p>
      <Link href="/dashboard" className="text-orange-400 hover:text-orange-300 mt-4 inline-block font-bold">← {t('common.back_to_dashboard')}</Link>
    </div>
  );

  const intervalLabel: Record<string, string> = { monthly: '/माह', quarterly: '/तिमाही', yearly: '/वर्ष' };
  const isCreditBasedCourse = Number(course.self_study_enabled || 0) === 1;
  const courseCreditCost = Number(course.self_study_credit_cost || 0);
  const availableSelfStudyCredits = credits ?? Number(selfStudyCredits?.balance || selfStudyCredits?.available || 0);
  const canUnlockWithCredits = isCreditBasedCourse && courseCreditCost > 0 && availableSelfStudyCredits >= courseCreditCost;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button onClick={() => router.push('/dashboard')} className="mb-8 text-neutral-400 hover:text-white flex items-center gap-2 transition-colors font-medium">
        <ChevronLeft className="w-4 h-4" /> {t('course.back_to_courses')}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 overflow-hidden shadow-2xl relative">
            <div className="h-64 bg-gradient-to-br from-orange-900/50 to-purple-900/50 relative">
              <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center" style={{backgroundImage:"url('https://picsum.photos/seed/vedic/1200/600')"}} />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="mb-3 flex flex-wrap gap-2"><span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black rounded-full inline-block uppercase tracking-widest">{t('course.details')}</span>{isCreditBasedCourse && <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"><Coins className="h-3 w-3" /> {t('dashboard.credit_based')}</span>}</div>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tighter">{course.title}</h1>
              </div>
            </div>
            <div className="p-8 md:p-12 space-y-6">
              <p className="text-lg md:text-xl text-neutral-300 leading-relaxed font-medium">{course.description}</p>
            </div>
          </div>

          <div className="space-y-6">

            {books.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 mb-6">
                  <BookOpen className="w-6 h-6 text-orange-500" /> {t('course.books')}
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  <button
                    onClick={() => setSelectedBookId(null)}
                    className={`px-6 py-3 rounded-2xl whitespace-nowrap font-medium transition-all shadow-xl shadow-black/20 ${selectedBookId === null ? 'bg-orange-600 text-white border border-orange-500/50' : 'bg-neutral-900/80 text-neutral-400 border border-white/5 hover:bg-neutral-800'}`}
                  >
                    {t('course.all_lessons')}
                  </button>
                  {books.map(book => (
                    <button
                      key={book.id}
                      onClick={() => setSelectedBookId(book.id)}
                      className={`px-6 py-3 rounded-2xl whitespace-nowrap font-medium transition-all shadow-xl shadow-black/20 ${selectedBookId === book.id ? 'bg-orange-600 text-white border border-orange-500/50' : 'bg-neutral-900/80 text-neutral-400 border border-white/5 hover:bg-neutral-800'}`}
                    >
                      {book.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 mb-6">
              <PlayCircle className="w-6 h-6 text-orange-500" /> {t('course.curriculum')}
            </h2>
            <div className="grid gap-3">
              {lessons.filter(l => selectedBookId === null || l.book_id === selectedBookId).map((lesson: any, idx: number) => {

                const canAccess = isPremiumUnlocked || (isEnrolled && lesson.is_free === 1) || (isEnrolled && !trialExpired && paymentStatus === 'trial');
                return (
                  <div key={lesson.id} className="group flex items-center justify-between p-5 bg-neutral-900 hover:bg-neutral-800/50 rounded-2xl border border-neutral-800 transition-all">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${canAccess ? 'bg-orange-600 shadow-lg shadow-orange-500/20 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                        {canAccess ? <PlayCircle className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-neutral-500">#{idx + 1}</span>
                          <h3 className="font-bold text-white text-lg">{lesson.title}</h3>
                          {lesson.is_free === 1 && <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded border border-emerald-500/20">{t('course.free')}</span>}
                        </div>
                        <p className="text-xs text-neutral-500 uppercase font-black tracking-widest mt-1">{lesson.type}</p>
                      </div>
                    </div>
                    {canAccess ? (
                      <Link href={`/dashboard/course/learn?id=${course.id}&lessonId=${lesson.id}`} className="px-6 py-2.5 bg-white text-black hover:bg-orange-500 hover:text-white rounded-xl text-sm font-black transition-all shadow-xl">
                        {t('course.view_now')}
                      </Link>
                    ) : (
                      <div className="text-right">
                        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                          <Lock className="w-3 h-3" /> {t('course.locked')}
                        </div>
                        <p className="text-[9px] text-orange-400/80 font-bold mt-1">
                          {!isEnrolled ? t('course.enroll_to_preview') : t('course.unlock_premium')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-neutral-900 p-6 md:p-8 rounded-[2.5rem] border border-neutral-800 shadow-2xl lg:sticky lg:top-24 space-y-6 max-h-[90dvh] lg:max-h-[calc(100dvh-6rem)] overflow-y-auto custom-scrollbar overscroll-contain">
            {isPremiumUnlocked ? (
              <div className="space-y-4">
                <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6" />
                  {hasSubscription ? t('course.subscription_active') : t('course.premium_active')}
                </div>
                <Link href={`/dashboard/course/learn?id=${course.id}`} className="flex items-center justify-center gap-2 w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-orange-500/30 hover:scale-[1.02]">
                  <PlayCircle className="w-6 h-6" /> {t('course.go_to_dashboard')}
                </Link>
                {hasSubscription && (
                  <Link href="/dashboard/subscription" className="block w-full py-3 text-center bg-violet-600/20 border border-violet-500/30 text-violet-400 rounded-2xl text-sm font-bold hover:bg-violet-600/30 transition-all">
                    <RefreshCw className="w-4 h-4 inline mr-2" /> {t('course.manage_subscription')}
                  </Link>
                )}
              </div>
            ) : isEnrolled ? (
              <div className="space-y-4">
                <div className={trialExpired ? "w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black flex items-center justify-center gap-3" : "w-full py-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl font-black flex items-center justify-center gap-3"}>
                  <CheckCircle2 className="w-6 h-6" />
                  {trialExpired ? t('course.trial_expired') : t('course.enrolled_free')}
                </div>
                <Link href={`/dashboard/course/learn?id=${course.id}`} className="flex items-center justify-center gap-2 w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-orange-500/30 hover:scale-[1.02]">
                  <PlayCircle className="w-6 h-6" /> {t('course.go_to_dashboard')}
                </Link>
                
                {paymentStatus !== 'paid' && (course.price_inr > 0 || trialUpgradePrice !== null) && (
                  <div className="pt-4 border-t border-neutral-800 mt-4">
                    <p className="text-xs text-neutral-500 font-bold mb-3 uppercase tracking-wider text-center">
                      {trialExpired ? t('course.upgrade_to_lifetime') : t('course.unlock_premium')}
                    </p>
                    <CheckoutPanel
                      itemType="course"
                      itemId={course.id}
                      amountPaise={Number(trialExpired && trialUpgradePrice !== null ? trialUpgradePrice : (course.price_inr || 0)) * 100}
                      loading={isEnrolling}
                      buttonLabel={trialExpired ? `${t('course.upgrade_for')} ₹${trialUpgradePrice}` : t('course.buy_premium')}
                      onCheckout={handleBuyPremium}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <div className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-1">{t('course.price')}</div>
                  <div className="text-5xl font-black text-white tracking-tighter">
                    ₹{course.price_inr || (course.price ? course.price / 100 : '0')}
                  </div>
                </div>

                {isCreditBasedCourse && (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm font-black text-violet-200">
                      <span className="inline-flex items-center gap-2"><Coins className="w-4 h-4" /> {t('dashboard.credit_balance')}</span>
                      <span>{courseCreditCost > 0 ? `${courseCreditCost} ${t('course.credits_required')}` : t('dashboard.credit_mode')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-neutral-950/60 px-3 py-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1 text-neutral-400"><Wallet className="h-3.5 w-3.5" /> {t('dashboard.your_credits')}</span>
                      <span className="text-white">{availableSelfStudyCredits} {t('dashboard.credits')}</span>
                    </div>
                    {Number(course.individual_class_booking_enabled || 0) === 1 && Number(course.individual_class_credit_cost || 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-violet-200/80">{t('course.individual_class')}: {course.individual_class_credit_cost} {t('dashboard.credits')} / {course.individual_class_duration_minutes || 30} min</p>
                        <button
                          onClick={() => { setShowBookingModal(true); setBookingResult(null); setBookingError(null); }}
                          className="flex items-center justify-center gap-2 w-full py-2 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 rounded-lg font-bold text-xs transition-all"
                        >
                          <Video className="w-3 h-3" /> {t('course.book_individual_class')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                  <button onClick={() => setPaymentTab('onetime')} className={`flex-1 py-2.5 text-sm font-black transition-all ${paymentTab === 'onetime' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-white'}`}>
                    <CreditCard className="w-4 h-4 inline mr-1" /> {t('course.buy_once')}
                  </button>
                  <button onClick={() => setPaymentTab('subscription')} className={`flex-1 py-2.5 text-sm font-black transition-all ${paymentTab === 'subscription' ? 'bg-violet-600 text-white' : 'text-neutral-400 hover:text-white'}`}>
                    <Crown className="w-4 h-4 inline mr-1" /> {t('course.subscribe')}
                  </button>
                </div>

                {paymentTab === 'onetime' && (
                  <div className="space-y-3">
                    {!isEnrolled && isCreditBasedCourse && courseCreditCost > 0 && (
                      <button onClick={handleUnlockWithCredits} disabled={isEnrolling || !canUnlockWithCredits} className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {isEnrolling ? <Loader2 className="w-6 h-6 animate-spin" /> : <Coins className="w-5 h-5" />}
                        {canUnlockWithCredits ? `${t('course.unlock_with_credits')} (${courseCreditCost})` : `${t('course.credits_insufficient')} (${availableSelfStudyCredits}/${courseCreditCost})`}
                      </button>
                    )}
                    {!isEnrolled && course.price_inr > 0 && (
                      <CheckoutPanel
                        itemType="course"
                        itemId={course.id}
                        amountPaise={Number(course.price_inr || 0) * 100}
                        loading={isEnrolling}
                        buttonLabel={t('course.buy_course')}
                        onCheckout={handleBuyPremium}
                      />
                    )}
                    {!isEnrolled && (!course.price_inr || Number(course.price_inr) <= 0) && (
                      <button onClick={handleEnrollFree} disabled={isEnrolling} id="enroll-button-main" className="w-full py-4 bg-white text-black hover:bg-orange-600 hover:text-white rounded-2xl font-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                        {isEnrolling ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-5 h-5" /> {t('course.enroll_free')}</>}
                      </button>
                    )}
                    <div className="pt-2 space-y-3">
                      {['course.lifetime_access', 'course.mobile_desktop_access', 'course.certificate'].map(f => (
                        <div key={f} className="flex items-center gap-3 text-sm text-neutral-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /><span>{t(f)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paymentTab === 'subscription' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Zap className="w-5 h-5 text-violet-400 shrink-0" />
                      <p className="text-xs text-violet-300 font-bold">{t('course.subscription_promo')}</p>
                    </div>
                    {subscriptionPlans.length === 0 ? (
                      <p className="text-center text-neutral-500 text-sm py-4">{t('course.no_plans_available')}</p>
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
                          <button onClick={() => handleSubscribe(plan.id)} disabled={isEnrolling} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                            {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4" /> {t('course.subscribe_now')}</>}
                          </button>
                        </div>
                      ))
                    )}
                    <div className="pt-2 space-y-2">
                      {['course.all_courses_unlocked', 'course.new_courses_included', 'course.cancel_anytime'].map(f => (
                        <div key={f} className="flex items-center gap-3 text-sm text-neutral-400">
                          <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" /><span>{t(f)}</span>
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
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #404040;
        }
      `}</style>

      {/* Individual Class Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !bookingLoading && setShowBookingModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black text-white flex items-center gap-2"><Video className="w-5 h-5 text-violet-400" /> {t('course.book_individual_class')}</h3>
              <button onClick={() => { if (!bookingLoading) { setShowBookingModal(false); setBookingResult(null); } }}><X className="w-5 h-5 text-neutral-500 hover:text-white" /></button>
            </div>

            {bookingResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-black">{t('course.class_booked')}</p>
                  <p className="text-xs text-neutral-400 mt-1">{t('course.credits_charged', { count: bookingResult.credits_charged })}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">{t('course.duration')}</span>
                    <span className="text-white font-bold">{bookingResult.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">{t('course.meeting_id')}</span>
                    <span className="text-violet-300 font-mono text-xs">{bookingResult.rtc_room_id}</span>
                  </div>
                </div>
                <a
                  href={`/live?roomId=${bookingResult.rtc_room_id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> {t('course.join_class_now')}
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">{bookingError}</div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">{t('course.credits_required')}</span>
                    <span className="text-violet-300 font-bold">{course?.individual_class_credit_cost}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-neutral-950 px-3 py-2">
                    <span className="text-neutral-500">{t('course.duration')}</span>
                    <span className="text-white font-bold">{course?.individual_class_duration_minutes || 30} minutes</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setBookingLoading(true);
                    setBookingError(null);
                    try {
                      const res = await fetch(`/api/courses/${id}/individual/book`, { method: 'POST' });
                      const data = await res.json() as any;
                      if (!res.ok) throw new Error(data.message || data.error || 'Booking failed');
                      if (data.newBalance != null) {
                        setCredits(data.newBalance);
                      } else {
                        refreshCredits();
                      }
                      setBookingResult(data);
                    } catch (e: any) {
                      setBookingError(e.message);
                    } finally {
                      setBookingLoading(false);
                    }
                  }}
                  disabled={bookingLoading}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-xl font-bold transition-all"
                >
                  {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                  {bookingLoading ? t('course.booking') : `${t('course.confirm')} — ${course?.individual_class_credit_cost} ${t('dashboard.credits')}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
