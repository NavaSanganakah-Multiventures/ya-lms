'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/CreditsContext';
import { Wallet, Activity, Plus, Zap } from 'lucide-react';
import CheckoutPanel, { CheckoutBillingAddress, CheckoutQuote } from '@/components/CheckoutPanel';

export default function WalletPage() {
  const { balance_inr, walletData, refreshBalance } = useWallet();
  const [ledger, setLedger] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(101);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshBalance();

    fetch('/api/wallet/ledger')
      .then(res => res.json())
      .then((data: any) => setLedger(data.ledger || []))
      .catch(console.error);

    fetch('/api/wallet/packs')
      .then(res => res.json())
      .then((data: any) => setPacks(data.packs || []))
      .catch(console.error);

    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [refreshBalance]);

  const handlePayment = async (checkout?: { couponCode?: string; billingAddress?: CheckoutBillingAddress; quote?: CheckoutQuote | null }) => {
    if (!amount || amount < 10) return alert('Minimum amount is ₹10');
    setLoading(true);

    try {
      const orderRes = await fetch('/api/razorpay/create-wallet-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paise: amount * 100,
          couponCode: checkout?.couponCode,
          billingAddress: checkout?.billingAddress
        })
      });
      const orderData = await orderRes.json() as any;

      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      if (orderData.freeCheckout) {
        alert('Coupon applied! Balance added.');
        await refreshBalance();
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Swadhyaya Vedika',
        description: `Add ₹${amount} to wallet`,
        order_id: orderData.order_id,
        prefill: {
          email: checkout?.billingAddress?.email || '',
          contact: checkout?.billingAddress?.phone || '',
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify-wallet-payment', {
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
              alert('Payment successful! Balance added.');
              await refreshBalance();
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
      const orderRes = await fetch('/api/razorpay/create-wallet-order', {
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
        await refreshBalance();
        return;
      }

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
            const verifyRes = await fetch('/api/razorpay/verify-wallet-payment', {
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
              await refreshBalance();
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
          <Wallet className="w-8 h-8 text-orange-500" /> My Wallet
        </h1>
        <p className="text-neutral-400 mt-2">Manage your wallet balance</p>
      </div>

      {/* Single Balance Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-400">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Available Balance</h3>
        </div>
        <p className="text-5xl font-black text-white">₹{balance_inr.toFixed(2)}</p>
        <div className="flex gap-4 mt-3 text-xs text-neutral-500 font-medium">
          <span>Deposited: ₹{(walletData?.lifetime_deposits_inr || 0).toFixed(2)}</span>
          <span>Withdrawn: ₹{(walletData?.lifetime_withdrawals_inr || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-black text-white mb-6">Add Funds</h2>

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
                <p className="text-sm text-neutral-400 mb-2 font-medium">You will receive</p>
                <div className="flex items-center justify-center gap-2 text-4xl font-black text-white">
                  ₹{amount.toFixed(2)} <Plus className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <CheckoutPanel
                itemType="wallet"
                itemId={`add-funds`}
                amountPaise={amount * 100}
                loading={loading}
                buttonLabel="Pay Now"
                onCheckout={handlePayment}
              />
            </div>
          </div>

          {packs.length > 0 && (
             <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
               <h2 className="text-xl font-black text-white mb-6">Wallet Packs</h2>
               <div className="space-y-4">
                 {packs.map((pack, idx) => (
                   <div key={idx} className="p-4 border border-neutral-800 bg-neutral-950 rounded-2xl flex items-center justify-between">
                     <div>
                       <h3 className="font-bold text-white">{pack.name}</h3>
                       <p className="text-xs text-neutral-400">{pack.description}</p>
                       <div className="mt-2 flex items-center gap-2 text-xs font-bold">
                         <span className="text-orange-400 bg-orange-500/10 px-2 py-1 rounded-md">₹{pack.amount_inr}</span>
                       </div>
                     </div>
                     <CheckoutPanel
                        itemType="wallet_pack"
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
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
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
                    <p className="text-sm font-bold text-white">{item.reason || 'Transaction'}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <div className={`text-lg font-black ${(item.change_amount_inr || item.change_amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{Math.abs(item.change_amount_inr || item.change_amount || 0).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
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
    </div>
  );
}
