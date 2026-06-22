'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Monitor, Globe, Trash2, BookOpen, CheckCircle2, CreditCard, Globe2, LogOut, ShieldCheck, User, Wallet } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StudentSettingsPage() {
  const router = useRouter();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage, t } = useLanguage();

  const [devices, setDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
    const [deletionStatus, setDeletionStatus] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/user/deletion-status')
      .then(res => res.json())
      .then(data => setDeletionStatus(data))
      .catch(() => {});
  }, []);

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure you want to request account deletion? Your account and all data will be permanently deleted in 30 days. You can cancel this request from the dashboard within this period.")) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch('/api/user/delete-account', { method: 'POST' });
      const data: any = await res.json();
      if (data.success) {
        setDeletionStatus({ pending: true, scheduled_deletion_date: data.scheduled_deletion_date });
        alert("Account deletion requested. A confirmation email has been sent.");
      } else {
        alert(data.error || "Failed to request deletion");
      }
    } catch(e) {
      alert("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/user/cancel-deletion', { method: 'POST' });
      const data: any = await res.json();
      if (data.success) {
        setDeletionStatus({ pending: false });
        alert("Account deletion request cancelled.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const [pushEnabled, setPushEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  useEffect(() => {
    fetch('/api/notifications/my-devices')
      .then(res => res.ok ? res.json() : { devices: [] })
      .then((data: any) => setDevices(data.devices || []))
      .catch(() => {})
      .finally(() => setDevicesLoading(false));
  }, []);

  const handleUnregisterDevice = async (deviceId: string) => {
    try {
      await fetch('/api/notifications/unregister-device', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      setDevices(prev => prev.filter(d => d.device_id !== deviceId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePush = async () => {
    try {
      if (pushEnabled) {
        if ('Notification' in window) {
          // Can't programmatically revoke permission — direct user to browser settings
          const sub = await navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription());
          if (sub) {
            await sub.unsubscribe();
            setPushEnabled(false);
          }
        }
      } else {
        const perm = await Notification.requestPermission();
        setPushEnabled(perm === 'granted');
        if (perm === 'granted') {
          fetch('/api/notifications/my-devices')
            .then(res => res.ok ? res.json() : { devices: [] })
            .then((data: any) => setDevices(data.devices || []))
            .catch(() => {})
            .finally(() => setDevicesLoading(false));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'web': return <Globe className="h-4 w-4" />;
      case 'flutter_android': return <Smartphone className="h-4 w-4" />;
      case 'flutter_ios': return <Smartphone className="h-4 w-4" />;
      case 'flutter_web': return <Globe className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'web': return 'Browser (Web)';
      case 'flutter_android': return 'Android App';
      case 'flutter_ios': return 'iOS App';
      case 'flutter_web': return 'Flutter Web';
      default: return platform;
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
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-300 flex-shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white">Push Notifications</h2>
              <p className="mt-1 text-sm text-neutral-500 max-w-md">
                Har platform par push notification ka ek unified system. Browser, Android aur iOS — sab par ek jaisa kaam karta hai.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePush}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                    pushEnabled
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {pushEnabled ? <><BellOff className="h-4 w-4" /> Disable</> : <><Bell className="h-4 w-4" /> Enable</>}
                </button>
              </div>

              {/* Registered Devices */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-neutral-400 mb-3">Registered Devices</h3>
                {devicesLoading ? (
                  <div className="text-sm text-neutral-500">Loading...</div>
                ) : devices.length === 0 ? (
                  <div className="text-sm text-neutral-500">No devices registered. Enable notifications to register this device.</div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {devices.map((d) => (
                      <div key={d.id} className="flex items-center justify-between bg-neutral-800/50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-neutral-400 flex-shrink-0">
                            {getPlatformIcon(d.platform)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{getPlatformLabel(d.platform)}</p>
                            <p className="text-xs text-neutral-500 truncate">{d.device_id?.substring(0, 16)}...</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnregisterDevice(d.device_id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1 flex-shrink-0"
                          title="Remove device"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-neutral-900 shadow-xl shadow-black/50">
            <div className="flex items-center gap-3 border-b border-red-500/10 bg-red-500/5 px-4 py-4 md:px-6">
              <div className="rounded-full bg-red-500/10 p-2 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Danger Zone</h2>
                <p className="text-xs text-neutral-400">Permanently remove your account and data.</p>
              </div>
            </div>
            <div className="p-4 md:p-6">
              {deletionStatus?.pending ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                  <p className="text-sm font-bold text-red-300 mb-2">Account Deletion Scheduled</p>
                  <p className="text-xs text-red-400/80 mb-4">Your account will be permanently deleted on {new Date(deletionStatus.scheduled_deletion_date).toLocaleDateString()}.</p>
                  <button
                    onClick={handleCancelDeletion}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-black text-white transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
                  >
                    Cancel Deletion Request
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-300">Delete Account</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                      Initiate the process to permanently delete your account, course progress, and personal data. This action is irreversible after 30 days.
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-neutral-800 px-4 py-2.5 text-sm font-bold text-red-400 transition-all hover:bg-red-500/10 active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Trash2 className="h-4 w-4" /> Request Deletion
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-black text-red-300 transition-all hover:bg-red-500/20 active:scale-95 flex-shrink-0"
          >
            <LogOut className="h-4 w-4" /> {t('common.logout')}
          </button>
        </div>
      </section>
    </div>
  );
}
