'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, Lock, PlayCircle, ChevronLeft, CreditCard, BookOpen } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import CheckoutPanel, { CheckoutBillingAddress, CheckoutQuote } from '@/components/CheckoutPanel';
import { useToast } from '@/contexts/ToastContext';

export default function BookClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { error: showError } = useToast();

  const [book, setBook] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const loadBookData = async () => {
      setIsLoading(true);
      try {
        const [bookData]: [any] = await Promise.all([
          fetch(`/api/books/${id}`).then(r => r.json()),
        ]);
        if (bookData.error) throw new Error(bookData.error);
        setBook(bookData.book);
        setIsEnrolled(bookData.isEnrolled);
        setPaymentStatus(bookData.paymentStatus || null);
        setLessons(bookData.book.lessons || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadBookData();
  }, [id]);

  const isPremiumUnlocked = paymentStatus === 'paid';

  const handleBuyPremium = async (checkout?: { couponCode?: string; billingAddress?: CheckoutBillingAddress; quote?: CheckoutQuote | null }) => {
    setIsEnrolling(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'book', itemId: id, couponCode: checkout?.couponCode, billingAddress: checkout?.billingAddress })
      });
      const { order, key, error: orderError, code, freeCheckout } = await res.json() as any;
      if (code === 'PAYMENT_NOT_CONFIGURED') {
        showError('Payment gateway is not configured. Please contact the administrator.');
        return;
      }
      if (orderError) throw new Error(orderError);
      if (freeCheckout) {
        setPaymentStatus('paid');
        setIsEnrolled(true);
        // Refresh book data
        const bookData: any = await fetch(`/api/books/${id}`).then(r => r.json());
        setBook(bookData.book);
        return;
      }

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: book.title,
        description: 'Book Purchase',
        order_id: order.id,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            if (!verifyRes.ok) throw new Error('Payment verification failed');
            setPaymentStatus('paid');
            setIsEnrolled(true);
            const bookData: any = await fetch(`/api/books/${id}`).then(r => r.json());
            setBook(bookData.book);
          } catch (err: any) {
            showError(err.message);
          }
        },
        theme: { color: '#f59e0b' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        showError('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  if (!id) return <div className="text-center py-20 text-neutral-400">Invalid Book ID</div>;
  if (isLoading) return null;
  if (error) return <div className="text-center py-20 text-red-400 bg-red-500/10 rounded-3xl border border-red-500/20">{error}</div>;
  if (!book) return <div className="text-center py-20 text-neutral-400 bg-neutral-900/50 rounded-3xl border border-neutral-800">Book not found</div>;

  const isFreeBook = book.price_rupees === 0 || book.price_rupees === null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <Link href="/courses" className="inline-flex items-center gap-2 text-neutral-400 hover:text-amber-400 transition-colors mb-8 group font-medium bg-neutral-900/50 px-4 py-2 rounded-full border border-neutral-800 hover:border-amber-500/30">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-3xl p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
              {book.thumbnail_url ? (
                <Image src={book.thumbnail_url} alt={book.title} width={192} height={256} className="w-full md:w-48 h-auto aspect-[3/4] object-cover rounded-2xl border border-neutral-800 shadow-xl" />
              ) : (
                <div className="w-full md:w-48 aspect-[3/4] bg-neutral-800/50 rounded-2xl flex items-center justify-center border border-neutral-700/50 shadow-inner">
                  <BookOpen className="w-16 h-16 text-neutral-600" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-500/20 shadow-sm">
                  <BookOpen className="w-3.5 h-3.5" /> Book
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">{book.title}</h1>
                <p className="text-neutral-400 text-lg leading-relaxed mb-6 font-medium">
                  {book.description || "No description provided."}
                </p>
                {book.title_hi && <p className="text-neutral-500 mt-2 font-medium">{book.title_hi}</p>}
                {book.description_hi && <p className="text-neutral-500 mt-2">{book.description_hi}</p>}
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-amber-500" /> Course Content
            </h2>
            <div className="space-y-4">
              {lessons.map((lesson: any, index: number) => {
                const isAccessible = lesson.is_free === 1 || isPremiumUnlocked;
                
                return (
                  <div key={lesson.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isAccessible ? 'bg-neutral-800/30 border-neutral-700/50 hover:bg-neutral-800/50' : 'bg-neutral-900/50 border-neutral-800/50 opacity-80'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl flex items-center justify-center shadow-inner ${isAccessible ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-800 text-neutral-500'}`}>
                        {isAccessible ? <PlayCircle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${isAccessible ? 'text-white' : 'text-neutral-400'}`}>
                          {index + 1}. {lesson.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900 px-2 py-0.5 rounded-md border border-neutral-800">{lesson.type}</span>
                          {lesson.is_free === 1 && !isPremiumUnlocked && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20 uppercase tracking-wider">Free Demo</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAccessible && isEnrolled ? (
                       <Link href={`/dashboard/book/learn?id=${id}&lesson=${lesson.id}`} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20">
                         View
                       </Link>
                    ) : (
                      !isAccessible && (
                        <div className="hidden sm:flex px-4 py-2 bg-neutral-900 text-neutral-500 text-xs font-bold rounded-lg border border-neutral-800">
                          Locked
                        </div>
                      )
                    )}
                  </div>
                );
              })}
              {lessons.length === 0 && (
                <div className="text-center py-12 bg-neutral-900/30 border border-neutral-800 border-dashed rounded-2xl">
                  <BookOpen className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 font-medium">No lessons available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            {!isPremiumUnlocked && !isFreeBook && (
              <CheckoutPanel
                itemType="book"
                itemId={id}
                amountPaise={(book.price_rupees || 0) * 100}
                onCheckout={handleBuyPremium}
                loading={isEnrolling}
              />
            )}

            {(isPremiumUnlocked || isFreeBook) && (
              <div className="bg-gradient-to-b from-neutral-900/90 to-neutral-950 border border-neutral-800/60 rounded-3xl p-8 backdrop-blur-sm shadow-xl text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">You Have Access</h3>
                <p className="text-neutral-400 mb-8 font-medium">You can read all lessons and materials inside this book.</p>
                <Link
                  href={`/dashboard/book/learn?id=${id}`}
                  className="block w-full py-4 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-amber-500/20 border border-amber-500 flex items-center justify-center gap-2 group"
                >
                  Start Reading <ChevronLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
