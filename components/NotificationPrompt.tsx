'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      const p = Notification.permission;
      if (p === 'default') {
        const timer = setTimeout(() => {
          setPermission(p);
          setShowBanner(true);
        }, 5000);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => setPermission(p), 0);
      }
    }
  }, []);

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

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const res = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await res.json() as any;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      setPermission('granted');
      setShowBanner(false);
    } catch (err) {
      console.error('Failed to subscribe user:', err);
    }
  };

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribeUser();
    } else {
      setShowBanner(false);
    }
  };

  if (!showBanner || permission !== 'default') return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl bg-opacity-90">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-indigo-400 animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-lg leading-tight">नोटिफिकेशन चालू करें?</h4>
            <p className="text-neutral-400 text-sm mt-1 leading-relaxed">
              महत्वपूर्ण अपडेट, लाइव क्लास और नए संदेशों के लिए ब्राउज़र नोटिफिकेशन चालू करें।
            </p>
            <div className="flex gap-3 mt-5">
              <button 
                onClick={requestPermission}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
              >
                हां, अनुमति दें
              </button>
              <button 
                onClick={() => setShowBanner(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-xl text-sm font-bold transition-all"
              >
                बाद में
              </button>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-neutral-600 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
