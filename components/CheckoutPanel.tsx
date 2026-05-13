'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Tag } from 'lucide-react';

export type CheckoutBillingAddress = {
  full_name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type CheckoutQuote = {
  subtotal_paise: number;
  discount_paise: number;
  total_paise: number;
  coupon?: { id: string; code: string; label: string } | null;
  message?: string;
};

type CheckoutPanelProps = {
  itemType: 'course' | 'batch' | 'ai_credits' | 'subscription' | 'form';
  itemId?: string | null;
  amountPaise: number;
  onCheckout: (payload: { couponCode: string; billingAddress: CheckoutBillingAddress; quote: CheckoutQuote | null }) => void;
  loading?: boolean;
  buttonLabel?: string;
  className?: string;
};

const EMPTY_ADDRESS: CheckoutBillingAddress = {
  full_name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

const formatRupees = (paise: number) => `₹${Math.max(0, Math.round(paise || 0) / 100).toLocaleString('en-IN')}`;

export default function CheckoutPanel({ itemType, itemId, amountPaise, onCheckout, loading, buttonLabel = 'Checkout करें', className = '' }: CheckoutPanelProps) {
  const [couponCode, setCouponCode] = useState('');
  const [billingAddress, setBillingAddress] = useState<CheckoutBillingAddress>(EMPTY_ADDRESS);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteMessage, setQuoteMessage] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const payablePaise = quote?.total_paise ?? amountPaise;
  const hasDiscount = (quote?.discount_paise || 0) > 0;

  const canCheckout = useMemo(() => {
    return Boolean(billingAddress.full_name.trim() && billingAddress.email.trim() && billingAddress.phone.trim() && billingAddress.line1.trim() && billingAddress.city.trim() && billingAddress.state.trim() && billingAddress.pincode.trim());
  }, [billingAddress]);

  useEffect(() => {
    setQuote(null);
    setQuoteMessage('');
  }, [amountPaise, itemType, itemId]);

  const updateAddress = (key: keyof CheckoutBillingAddress, value: string) => {
    setBillingAddress(prev => ({ ...prev, [key]: value }));
  };

  const applyCoupon = async () => {
    setCheckingCoupon(true);
    setQuoteMessage('');
    try {
      const res = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemId, amount_paise: amountPaise, couponCode }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || 'Coupon apply nahi hua');
      setQuote(data.quote);
      setQuoteMessage(data.quote?.message || (data.quote?.discount_paise > 0 ? 'Coupon apply ho gaya.' : 'Coupon valid hai.'));
    } catch (err: any) {
      setQuote(null);
      setQuoteMessage(err.message || 'Coupon valid nahi hai');
    } finally {
      setCheckingCoupon(false);
    }
  };

  return (
    <div className={`rounded-3xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-black text-white">
        <MapPin className="h-4 w-4 text-orange-400" /> Billing Address / Checkout
      </div>

      <div className="grid grid-cols-1 gap-3">
        <input value={billingAddress.full_name} onChange={e => updateAddress('full_name', e.target.value)} className="input-dark w-full" placeholder="Full name *" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={billingAddress.email} onChange={e => updateAddress('email', e.target.value)} className="input-dark w-full" placeholder="Email *" />
          <input value={billingAddress.phone} onChange={e => updateAddress('phone', e.target.value)} className="input-dark w-full" placeholder="Phone *" />
        </div>
        <input value={billingAddress.line1} onChange={e => updateAddress('line1', e.target.value)} className="input-dark w-full" placeholder="Address line 1 *" />
        <input value={billingAddress.line2} onChange={e => updateAddress('line2', e.target.value)} className="input-dark w-full" placeholder="Address line 2" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input value={billingAddress.city} onChange={e => updateAddress('city', e.target.value)} className="input-dark w-full" placeholder="City *" />
          <input value={billingAddress.state} onChange={e => updateAddress('state', e.target.value)} className="input-dark w-full" placeholder="State *" />
          <input value={billingAddress.pincode} onChange={e => updateAddress('pincode', e.target.value)} className="input-dark w-full" placeholder="PIN code *" />
        </div>
      </div>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 space-y-3">
        <div className="flex gap-2">
          <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="input-dark flex-1" placeholder="Coupon code" />
          <button type="button" onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim()} className="rounded-xl bg-orange-600 px-4 text-sm font-black text-white disabled:opacity-50">
            {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />}
          </button>
        </div>
        {quoteMessage && <p className={`text-xs font-bold ${hasDiscount ? 'text-emerald-300' : 'text-orange-200'}`}>{quoteMessage}</p>}
      </div>

      <div className="space-y-2 rounded-2xl bg-neutral-900 p-3 text-sm">
        <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span>{formatRupees(amountPaise)}</span></div>
        <div className="flex justify-between text-emerald-300"><span>Discount</span><span>- {formatRupees(quote?.discount_paise || 0)}</span></div>
        <div className="flex justify-between border-t border-neutral-800 pt-2 text-lg font-black text-white"><span>Total</span><span>{formatRupees(payablePaise)}</span></div>
      </div>

      <button type="button" onClick={() => onCheckout({ couponCode, billingAddress, quote })} disabled={loading || !canCheckout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-black text-black transition-all hover:bg-orange-600 hover:text-white disabled:opacity-50">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        {buttonLabel} • {formatRupees(payablePaise)}
      </button>
      {!canCheckout && <p className="text-center text-[11px] font-bold text-neutral-500">Checkout ke liye required billing fields bharna zaroori hai.</p>}
      <style>{`.input-dark{background:#0a0a0a;border:1px solid #262626;border-radius:12px;padding:10px 14px;color:white;font-size:14px;outline:none;transition:border-color .2s}.input-dark:focus{border-color:#f97316}`}</style>
    </div>
  );
}
