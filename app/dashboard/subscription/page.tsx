'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, CheckCircle2, XCircle, AlertTriangle, Loader2, Calendar, Zap, RefreshCw, ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import Script from 'next/script';
import { formatLocalDate } from '@/lib/time';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active:        { label: 'सक्रिय',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  authenticated: { label: 'प्रमाणित',     color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',         icon: CheckCircle2 },
  created:       { label: 'बनाया गया',    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',   icon: Clock },
  pending:       { label: 'लंबित',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',   icon: Clock },
  halted:        { label: 'रुका हुआ',     color: 'text-red-400 bg-red-500/10 border-red-500/20',            icon: AlertTriangle },
  cancelled:     { label: 'रद्द',         color: 'text-neutral-400 bg-neutral-500/10 border-neutral-700',   icon: XCircle },
  completed:     { label: 'पूर्ण',        color: 'text-neutral-400 bg-neutral-500/10 border-neutral-700',   icon: CheckCircle2 },
  expired:       { label: 'समाप्त',       color: 'text-neutral-400 bg-neutral-500/10 border-neutral-700',   icon: XCircle },
};

const intervalLabel: Record<string, string> = { monthly: 'मासिक', quarterly: 'त्रैमासिक', yearly: 'वार्षिक' };

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [subData, plansData]: [any, any] = await Promise.all([
          fetch('/api/subscription/me').then(r => r.json()),
          fetch('/api/subscription/plans').then(r => r.json())
        ]);
        setSubscription(subData?.subscription || null);
        setPlans(plansData?.plans || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const reloadData = async () => {
    setIsLoading(true);
    try {
      const [subData, plansData]: [any, any] = await Promise.all([
        fetch('/api/subscription/me').then(r => r.json()),
        fetch('/api/subscription/plans').then(r => r.json())
      ]);
      setSubscription(subData?.subscription || null);
      setPlans(plansData?.plans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' });
      const data = await res.json() as any;
      if (res.ok) {
        setShowCancelConfirm(false);
        reloadData();
        alert('सब्सक्रिप्शन रद्द कर दिया गया। वर्तमान अवधि के अंत तक एक्सेस रहेगी।');
      } else throw new Error(data.error);
    } catch (err: any) { alert(err.message); }
    finally { setIsCancelling(false); }
  };

  const handleSubscribe = async (planId: string) => {
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Failed');

      const options = {
        key: data.key,
        subscription_id: data.subscription_id,
        name: 'Adityanveshan',
        description: `${data.plan.name} — सभी कोर्स एक्सेस`,
        prefill: { email: data.user?.email, name: data.user?.name },
        handler: () => { reloadData(); alert('सब्सक्रिप्शन सक्रिय! 🎉'); },
        theme: { color: '#7c3aed' }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) { alert(err.message); }
    finally { setIsSubscribing(false); }
  };

  const hasActiveSub = subscription && ['active', 'authenticated', 'created'].includes(subscription.status);
  const statusCfg = subscription ? (STATUS_CONFIG[subscription.status] || STATUS_CONFIG['pending']) : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <button onClick={() => router.push('/dashboard')} className="mb-8 text-neutral-400 hover:text-white flex items-center gap-2 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> डैशबोर्ड पर वापस जाएँ
        </button>

        <div className="mb-10">
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Crown className="w-8 h-8 text-violet-400" /> सब्सक्रिप्शन
          </h1>
          <p className="text-neutral-400 mt-2">सभी कोर्सेस को एक सब्सक्रिप्शन से एक्सेस करें।</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Subscription Card */}
            {subscription ? (
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-neutral-800 bg-gradient-to-r from-violet-900/20 to-neutral-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">वर्तमान प्लान</div>
                      <h2 className="text-3xl font-black text-white">{subscription.plan_name}</h2>
                      <p className="text-violet-300 font-bold mt-1">
                        ₹{Math.round(subscription.amount_inr / 100)} {intervalLabel[subscription.interval] || subscription.interval}
                      </p>
                    </div>
                    {statusCfg && (
                      <span className={`px-4 py-2 rounded-full text-sm font-black border ${statusCfg.color} flex items-center gap-2`}>
                        <statusCfg.icon className="w-4 h-4" />
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
                  {subscription.current_period_start && (
                    <div>
                      <div className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">अवधि शुरू</div>
                      <div className="text-white font-bold text-sm">
                        {formatLocalDate(subscription.current_period_start)}
                      </div>
                    </div>
                  )}
                  {subscription.current_period_end && (
                    <div>
                      <div className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">अगली नवीनीकरण</div>
                      <div className="text-white font-bold text-sm">
                        {formatLocalDate(subscription.current_period_end)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-1">Razorpay ID</div>
                    <div className="text-neutral-400 font-mono text-xs truncate">{subscription.razorpay_subscription_id || '—'}</div>
                  </div>
                </div>

                {/* Actions */}
                {hasActiveSub && (
                  <div className="px-8 pb-8">
                    {!showCancelConfirm ? (
                      <button onClick={() => setShowCancelConfirm(true)}
                        className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-black transition-all">
                        <XCircle className="w-4 h-4 inline mr-2" /> सब्सक्रिप्शन रद्द करें
                      </button>
                    ) : (
                      <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-red-300 font-black text-sm">क्या आप निश्चित हैं?</p>
                            <p className="text-neutral-400 text-xs mt-1">रद्द करने पर वर्तमान अवधि के अंत तक एक्सेस रहेगी।</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleCancel} disabled={isCancelling}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-black transition-all disabled:opacity-50 flex items-center gap-2">
                            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            हाँ, रद्द करें
                          </button>
                          <button onClick={() => setShowCancelConfirm(false)}
                            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-black transition-all">
                            नहीं, रखें
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Halted — encourage to update payment */}
                {subscription.status === 'halted' && (
                  <div className="px-8 pb-8">
                    <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-300 font-black text-sm">भुगतान विफल हुआ</p>
                        <p className="text-neutral-400 text-xs mt-1">Razorpay Dashboard पर जाकर भुगतान विवरण अपडेट करें।</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-10 text-center">
                <Crown className="w-16 h-16 text-violet-400/30 mx-auto mb-4" />
                <h2 className="text-xl font-black text-white mb-2">कोई सक्रिय सब्सक्रिप्शन नहीं</h2>
                <p className="text-neutral-500 text-sm">नीचे एक प्लान चुनें और सभी कोर्सेस एक्सेस करें।</p>
              </div>
            )}

            {/* Upgrade / Available Plans */}
            {!hasActiveSub && plans.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-violet-400" /> उपलब्ध प्लान
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan: any, i: number) => {
                    const isPopular = i === 1;
                    return (
                      <div key={plan.id}
                        className={`relative bg-neutral-900 rounded-3xl border p-8 flex flex-col gap-6 transition-all hover:scale-[1.02] ${isPopular ? 'border-violet-500/50 shadow-xl shadow-violet-500/10' : 'border-neutral-800'}`}>
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="px-4 py-1 bg-violet-600 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg">
                              सबसे लोकप्रिय
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-5 h-5 text-violet-400" />
                            <span className="font-black text-white text-lg">{plan.name}</span>
                          </div>
                          <div className="text-4xl font-black text-white">
                            ₹{Math.round(plan.amount_inr / 100)}
                            <span className="text-base font-bold text-neutral-500">{intervalLabel[plan.interval] ? `/${intervalLabel[plan.interval]}` : ''}</span>
                          </div>
                        </div>
                        <div className="space-y-2 flex-1">
                          {['सभी कोर्स एक्सेस', 'नए कोर्स तुरंत', 'कभी भी रद्द करें'].map(f => (
                            <div key={f} className="flex items-center gap-2 text-sm text-neutral-400">
                              <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />{f}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => handleSubscribe(plan.id)} disabled={isSubscribing}
                          className={`w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isPopular ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25' : 'bg-neutral-800 hover:bg-neutral-700 text-white'}`}>
                          {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> अभी सब्सक्राइब करें</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Benefits Section */}
            <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-8">
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-400" /> सब्सक्रिप्शन के फायदे
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['सभी कोर्स अनलॉक', 'एक सब्सक्रिप्शन से सभी पाठ्यक्रम देखें'],
                  ['नए कोर्स तुरंत', 'जैसे ही नया कोर्स आए, आपको एक्सेस मिले'],
                  ['लाइव सेशन', 'सभी लाइव क्लास में शामिल हों'],
                  ['कभी भी रद्द करें', 'कोई छुपा हुआ शुल्क नहीं'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex items-start gap-3 p-4 rounded-2xl bg-neutral-800/50">
                    <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-white text-sm">{title}</div>
                      <div className="text-neutral-500 text-xs mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
