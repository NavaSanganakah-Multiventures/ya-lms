'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell, BellOff, BookOpen, CheckCircle2, CreditCard, Globe2, LogOut, ShieldCheck, User, Wallet } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StudentSettingsPage() {
  const router = useRouter();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
          setPushLoading(false);
        });
      });
    } else {
      setPushLoading(false);
    }
  }, []);

  const handleTogglePush = async () => {
    try {
      setPushLoading(true);
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const reg = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        // Disable Push
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint })
          });
        }
        setPushEnabled(false);
      } else {
        // Enable Push
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            const res = await fetch('/api/notifications/vapid-public-key');
            const { publicKey } = await res.json() as any;

            const urlBase64ToUint8Array = (base64String: string) => {
              const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
              const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
              const rawData = window.atob(base64);
              const outputArray = new Uint8Array(rawData.length);
              for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
              }
              return outputArray;
            };

            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
          }
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub })
          });
          setPushEnabled(true);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPushLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
    router.refresh();
  };

  const preferenceCardClass = 'rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-xl shadow-black/10';
  const optionBaseClass = 'flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition-all active:scale-[0.98]';

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-orange-500/20 bg-gradient-to-br from-neutral-900 via-neutral-900 to-orange-950/30 p-6 shadow-2xl shadow-orange-950/10 md:p-8">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Student Preferences
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">सेटिंग्स</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              Apni student panel preferences yahin se manage karein. Language, currency, profile aur notifications ke shortcuts ab ek proper page par available hain.
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-500 active:scale-95"
          >
            <User className="h-4 w-4" /> Edit Profile
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={preferenceCardClass}>
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-400">
              <Globe2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('common.language')}</h2>
              <p className="mt-1 text-sm text-neutral-500">Dashboard ki display language choose karein.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`${optionBaseClass} ${language === 'hi' ? 'border-orange-500 bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-orange-500/50 hover:text-white'}`}
            >
              {language === 'hi' && <CheckCircle2 className="h-4 w-4" />} हिंदी
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`${optionBaseClass} ${language === 'en' ? 'border-orange-500 bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-orange-500/50 hover:text-white'}`}
            >
              {language === 'en' && <CheckCircle2 className="h-4 w-4" />} English
            </button>
          </div>
        </div>

        <div className={preferenceCardClass}>
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{t('common.currency')}</h2>
              <p className="mt-1 text-sm text-neutral-500">Course prices aur payment amounts ke liye preferred currency set karein.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setCurrency('INR')}
              className={`${optionBaseClass} ${currency === 'INR' ? 'border-orange-500 bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-orange-500/50 hover:text-white'}`}
            >
              {currency === 'INR' && <CheckCircle2 className="h-4 w-4" />} ₹ INR
            </button>
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`${optionBaseClass} ${currency === 'USD' ? 'border-orange-500 bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-orange-500/50 hover:text-white'}`}
            >
              {currency === 'USD' && <CheckCircle2 className="h-4 w-4" />} $ USD
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/dashboard/profile" className="group rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition-all hover:border-orange-500/50 hover:bg-neutral-800/80">
          <div className="mb-4 inline-flex rounded-2xl bg-neutral-950 p-3 text-orange-400 group-hover:bg-orange-500/10">
            <User className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-white">Profile Details</h3>
          <p className="mt-2 text-sm text-neutral-500">Name, phone, address aur bio update karein.</p>
        </Link>

        <Link href="/dashboard/my-courses" className="group rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition-all hover:border-orange-500/50 hover:bg-neutral-800/80">
          <div className="mb-4 inline-flex rounded-2xl bg-neutral-950 p-3 text-orange-400 group-hover:bg-orange-500/10">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-white">Learning</h3>
          <p className="mt-2 text-sm text-neutral-500">Apne enrolled courses aur progress par wapas jayein.</p>
        </Link>

        <Link href="/dashboard/subscription" className="group rounded-3xl border border-neutral-800 bg-neutral-900 p-5 transition-all hover:border-violet-500/50 hover:bg-neutral-800/80">
          <div className="mb-4 inline-flex rounded-2xl bg-neutral-950 p-3 text-violet-300 group-hover:bg-violet-500/10">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-white">Subscription</h3>
          <p className="mt-2 text-sm text-neutral-500">Courses, subscription aur access plans explore karein.</p>
        </Link>
      </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300">
              <Bell className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white">Browser Notifications</h2>
              <p className="mt-1 text-sm text-neutral-500 max-w-md">
                Live classes aur announcements ki jankari seedhe browser par paane ke liye browser notifications enable/disable karein.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={pushLoading}
                  onClick={handleTogglePush}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                    pushEnabled
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  } disabled:opacity-50`}
                >
                  {pushEnabled ? <><BellOff className="h-4 w-4" /> Disable Push</> : <><Bell className="h-4 w-4" /> Enable Push</>}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition-all hover:bg-red-500/20 active:scale-95"
          >
            <LogOut className="h-4 w-4" /> {t('common.logout')}
          </button>
        </div>
      </section>
    </div>
  );
}
