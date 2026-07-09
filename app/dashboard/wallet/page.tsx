'use client';

import React, { useState, useEffect } from 'react';
import { useCredits } from '@/contexts/CreditsContext';
import { Sparkles, Video, BookOpen, Clock, Activity, Zap, Check, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import CheckoutPanel, { CheckoutBillingAddress, CheckoutQuote } from '@/components/CheckoutPanel';

export default function WalletPage() {
  const { balances, refreshCredits } = useCredits();
  const [ledger, setLedger] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);

  const [amount, setAmount] = useState<number>(101);
  const [selectedType, setSelectedType] = useState<'ai' | 'live_class' | 'self_study'>('ai');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({
    creditsPerInr: 10,
    featuredAmountInr: 101,
    featuredCredits: 1000,
    deductionPerRequest: 2,
  });

  const credits = amount === pricing.featuredAmountInr && selectedType === 'ai'
    ? pricing.featuredCredits
    : Math.floor(amount * pricing.creditsPerInr);

  useEffect(() => {
    refreshCredits();

    // Fetch ledger
    fetch('/api/credits/ledger')
      .then(res => res.json())
      .then((data: any) => setLedger(data.ledger || []))
      .catch(console.error);

    // Fetch packs
    fetch('/api/credits/packs')
      .then(res => res.json())
      .then((data: any) => setPacks(data.packs || []))
      .catch(console.error);

    // Fetch settings for AI pricing fallback
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: any) => {
        const settings = data?.settings || {};
        const nextPricing = {
          creditsPerInr: Number(settings.ai_credits_per_inr) || 10,
          featuredAmountInr: Number(settings.ai_featured_pack_amount_inr) || 101,
          featuredCredits: Number(settings.ai_featured_pack_credits) || 1000,
          deductionPerRequest: Number(settings.ai_credit_deduction_per_request) || 2,
        };
        setPricing(nextPricing);
        setAmount(prevAmount => prevAmount === 101 ? nextPricing.featuredAmountInr : prevAmount);
      })
      .catch(console.error);

    // Load Razorpay
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [refreshCredits]);

  const handlePayment = async (checkout?: { couponCode?: string; billingAddress?: CheckoutBillingAddress; quote?: CheckoutQuote | null }) => {
    if (!amount || amount < 10) return alert('Minimum amount is ₹10');
    setLoading(true);

    try {
      // 1. Create order
      const orderRes = await fetch('/api/razorpay/create-credits-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paise: amount * 100,
          credits: credits,
          credit_type: selectedType,
          couponCode: checkout?.couponCode,
          billingAddress: checkout?.billingAddress
        })
      });
      const orderData = await orderRes.json() as any;

      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      if (orderData.freeCheckout) {
        alert('Coupon applied! Credits added.');
        await refreshCredits();
        return;
      }

      // 2. Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Swadhyaya Vedika',
        description: `Purchase ${credits} ${selectedType} Credits`,
        order_id: orderData.order_id,
        prefill: {
          email: checkout?.billingAddress?.email || '',
          contact: checkout?.billingAddress?.phone || '',
        },
        handler: async function (response: any) {
          try {
            // 3. Verify payment
            const verifyRes = await fetch('/api/razorpay/verify-credits-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json() as any;

            if (verifyRes.ok) {
              alert('Payment successful! Credits added.');
              await refreshCredits();
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            alert(err.message);
          }
        },
        theme: {
          color: '#ea580c'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(response.error.description);
      });
      rzp.open();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePackPurchase = async (pack: any, checkout?: { couponCode?: string; billingAddress?: CheckoutBillingAddress; quote?: CheckoutQuote | null }) => {
    setLoading(true);

    try {
      // 1. Create order
      const orderRes = await fetch('/api/razorpay/create-credits-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pack_id: pack.id,
          couponCode: checkout?.couponCode,
          billingAddress: checkout?.billingAddress
        })
      });
      const orderData = await orderRes.json() as any;

      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      if (orderData.freeCheckout) {
        alert('Coupon applied! Pack purchased.');
        await refreshCredits();
        return;
      }

      // 2. Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Swadhyaya Vedika',
        description: `Purchase Pack: ${pack.name}`,
        order_id: orderData.order_id,
        prefill: {
          email: checkout?.billingAddress?.email || '',
          contact: checkout?.billingAddress?.phone || '',
        },
        handler: async function (response: any) {
          try {
            // 3. Verify payment
            const verifyRes = await fetch('/api/razorpay/verify-credits-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json() as any;

            if (verifyRes.ok) {
              alert('Payment successful! Pack added.');
              await refreshCredits();
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (err: any) {
            alert(err.message);
          }
        },
        theme: {
          color: '#ea580c'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(response.error.description);
      });
      rzp.open();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Zap className="w-8 h-8 text-orange-500" /> My Wallet
        </h1>
        <p className="text-neutral-400 mt-2">Manage your AI, Live Class, and Self-Study credits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Credits</h3>
          </div>
          <p className="text-4xl font-black text-white">{balances?.ai_balance || 0}</p>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Lifetime: {balances?.lifetime_ai_credits || 0}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Live Classes</h3>
          </div>
          <p className="text-4xl font-black text-white">{balances?.live_class_balance || 0}</p>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Lifetime: {balances?.lifetime_live_class_credits || 0}</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Self-Study</h3>
          </div>
          <p className="text-4xl font-black text-white">{balances?.self_study_balance || 0}</p>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Lifetime: {balances?.lifetime_self_study_credits || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-black text-white mb-6">Add Credits</h2>

            <div className="flex gap-2 mb-6">
              {[
                { id: 'ai', label: 'AI Credits', icon: Sparkles },
                { id: 'live_class', label: 'Live Classes', icon: Video },
                { id: 'self_study', label: 'Self Study', icon: BookOpen }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id as any)}
                  className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-2 transition-all border ${
                    selectedType === type.id
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                      : 'bg-neutral-800/50 border-transparent text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <type.icon className="w-5 h-5" />
                  <span className="text-xs font-bold">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-neutral-300 block mb-2">Enter Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-neutral-400">₹</span>
                  <input
                    type="number"
                    min="10"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 focus:border-orange-500 text-white font-bold text-lg rounded-xl pl-10 pr-4 py-3 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                <p className="text-sm text-neutral-400 mb-2 font-medium">Total Credits</p>
                <div className="flex items-center justify-center gap-2 text-4xl font-black text-white">
                  {credits} <Plus className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <CheckoutPanel
                itemType="credits"
                itemId={`custom-${selectedType}`}
                amountPaise={amount * 100}
                loading={loading}
                buttonLabel="Pay Now"
                onCheckout={handlePayment}
              />
            </div>
          </div>

          {packs.length > 0 && (
             <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
               <h2 className="text-xl font-black text-white mb-6">Credit Packs</h2>
               <div className="space-y-4">
                 {packs.map((pack, idx) => (
                   <div key={idx} className="p-4 border border-neutral-800 bg-neutral-950 rounded-2xl flex items-center justify-between">
                     <div>
                       <h3 className="font-bold text-white">{pack.name}</h3>
                       <p className="text-xs text-neutral-400">{pack.description}</p>
                       <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                         <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md">{pack.credits} {pack.credit_type} credits</span>
                         <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">₹{pack.amount_inr}</span>
                       </div>
                     </div>
                     <CheckoutPanel
                        itemType="credit_pack"
                        itemId={pack.id}
                        amountPaise={pack.amount_inr * 100}
                        loading={loading}
                        buttonLabel="Buy"
                        onCheckout={(checkout) => handlePackPurchase(pack, checkout)}
                      />
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl flex flex-col h-[600px]">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-neutral-400" /> Ledger History
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {ledger.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-sm">
                No history found
              </div>
            ) : (
              ledger.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white capitalize">{item.credit_type} Credit</p>
                    <p className="text-xs text-neutral-400">{item.reason}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`text-lg font-black ${item.change_amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {item.change_amount > 0 ? '+' : ''}{item.change_amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
