'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Zap, Loader2, ShieldCheck, Check } from 'lucide-react';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCredits: number) => void;
}

export default function BuyCreditsModal({ isOpen, onClose, onSuccess }: BuyCreditsModalProps) {
  const [amount, setAmount] = useState<number>(101);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({
    creditsPerInr: 10,
    featuredAmountInr: 101,
    featuredCredits: 1000,
    deductionPerRequest: 2,
  });

  const credits = amount === pricing.featuredAmountInr
    ? pricing.featuredCredits
    : Math.floor(amount * pricing.creditsPerInr);

  // Load Razorpay SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: any) => {
        const settings = data?.settings || {};
        setPricing({
          creditsPerInr: Number(settings.ai_credits_per_inr) || 10,
          featuredAmountInr: Number(settings.ai_featured_pack_amount_inr) || 101,
          featuredCredits: Number(settings.ai_featured_pack_credits) || 1000,
          deductionPerRequest: Number(settings.ai_credit_deduction_per_request) || 2,
        });
      })
      .catch(() => {
        // Keep safe defaults if public settings are unavailable.
      });
  }, []);

  const handlePayment = async () => {
    if (!amount || amount < 10) return alert('Minimum amount is ₹10');
    setLoading(true);

    try {
      // 1. Create order
      const orderRes = await fetch('/api/razorpay/create-credits-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_paise: amount * 100, credits })
      });
      const orderData = await orderRes.json() as any;

      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      // 2. Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Swadhyaya Vedika',
        description: `Purchase ${orderData.credits || credits} AI Credits`,
        order_id: orderData.order_id,
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
              onSuccess(verifyData.ai_credits);
              onClose();
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" 
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl shadow-orange-500/10 overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-white/5 bg-neutral-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Buy AI Credits</h3>
                  <p className="text-xs text-neutral-500">Pay as you go • Instant access</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-full transition-colors"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 mb-1 uppercase tracking-widest font-bold">Exchange Rate</p>
                  <p className="text-lg font-black text-white">₹1 = {pricing.creditsPerInr} credits</p>
                  <p className="text-xs text-orange-200/80 mt-1">₹{pricing.featuredAmountInr} pack = {pricing.featuredCredits} credits</p>
                </div>
                <Zap className="w-6 h-6 text-orange-400" />
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

                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="h-px bg-neutral-800 flex-1" />
                  <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">You Get</span>
                  <div className="h-px bg-neutral-800 flex-1" />
                </div>

                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
                  <p className="text-sm text-neutral-400 mb-2 font-medium">Total AI Credits</p>
                  <div className="flex items-center justify-center gap-2 text-4xl font-black text-white">
                    {credits} <Sparkles className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="mt-3 text-xs font-bold text-neutral-500">AI use पर {pricing.deductionPerRequest} credits deduct होंगे</p>
                </div>
              </div>

              <button 
                onClick={handlePayment}
                disabled={loading || amount < 10}
                className="w-full relative group overflow-hidden bg-white text-neutral-950 font-black text-sm py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    <><ShieldCheck className="w-5 h-5" /> Pay ₹{amount} Securely</>
                  )}
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 font-medium pt-2">
                <Check className="w-3 h-3 text-emerald-500" /> Secured by Razorpay
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
