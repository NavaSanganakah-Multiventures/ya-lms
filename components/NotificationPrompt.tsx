'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const DEVICE_ID_KEY = 'lms_device_id';

function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [showBanner, setShowBanner] = useState(false);

  const subscribeViaPushManager = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const res = await fetch('/api/notifications/vapid-public-key');
        if (!res.ok) throw new Error('Failed to fetch VAPID public key');
        const vapidData: any = await res.json();
        const publicKey = vapidData.publicKey as string;

        if (!publicKey) {
          console.warn('VAPID public key is empty, aborting PushManager subscription');
          return;
        }

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

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const deviceId = getOrCreateDeviceId();
      const postRes = await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcm_token: '',
          platform: 'web',
          device_id: deviceId,
          user_agent: navigator.userAgent,
          endpoint: subscription.endpoint,
          subscription_json: JSON.stringify(subscription),
        }),
      });

      if (postRes.status === 401) return;
      if (!postRes.ok) throw new Error('Server error');

      setPermission('granted');
      setShowBanner(false);
    } catch (err) {
      console.error('Failed to subscribe via PushManager:', err);
    }
  };

  const subscribeViaFCM = useCallback(async () => {
    try {
      const configRes = await fetch('/api/firebase/config');
      if (!configRes.ok) throw new Error('Firebase config not available');
      const config: any = await configRes.json();
      if (!config.apiKey || !config.projectId) throw new Error('Invalid Firebase config');

      const app = getApps().length ? getApps()[0] : initializeApp(config);
      let messaging;
      try {
        messaging = getMessaging(app);
      } catch {
        throw new Error('Firebase messaging not available');
      }

      let swReg: ServiceWorkerRegistration;
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch {
        throw new Error('Service worker registration failed');
      }

      let vapidKey = '';
      try {
        const vapidRes = await fetch('/api/notifications/vapid-public-key');
        if (vapidRes.ok) {
          const vapidData: any = await vapidRes.json();
          vapidKey = vapidData.publicKey || '';
        }
      } catch {}

      if (!vapidKey) throw new Error('VAPID key not available');

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (!fcmToken) throw new Error('FCM token empty');

      const deviceId = getOrCreateDeviceId();
      const res = await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcm_token: fcmToken,
          platform: 'web',
          device_id: deviceId,
          user_agent: navigator.userAgent,
        }),
      });

      if (res.status === 401) return;
      if (!res.ok) throw new Error('Server error');

      setPermission('granted');
      setShowBanner(false);
    } catch (err) {
      console.warn('FCM subscription failed, trying legacy PushManager:', err);
      await subscribeViaPushManager();
    }
  }, []);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribeViaFCM();
    } else {
      setShowBanner(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = Notification.permission;
      if (p === 'default') {
        const timer = setTimeout(() => {
          setShowBanner(true);
        }, 5000);
        return () => clearTimeout(timer);
      } else if (p === 'granted') {
        const timer = setTimeout(() => {
          subscribeViaFCM();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [subscribeViaFCM]);

  if (!showBanner || permission !== 'default') return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:w-96 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-xl bg-opacity-90">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-orange-400 animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-lg leading-tight">नोटिफिकेशन चालू करें?</h4>
            <p className="text-neutral-400 text-sm mt-1 leading-relaxed">
              महत्वपूर्ण अपडेट, लाइव क्लास और नए संदेशों के लिए ब्राउज़र नोटिफिकेशन चालू करें।
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={requestPermission}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all active:scale-95"
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
          <button
            onClick={() => setShowBanner(false)}
            className="text-neutral-600 hover:text-white transition-colors"
            aria-label="Dismiss"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
