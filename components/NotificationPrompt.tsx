'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const DEVICE_ID_KEY = 'lms_device_id';

async function fetchFirebaseConfig() {
  const res = await fetch('/api/firebase/config');
  if (!res.ok) return null;
  const cfg: any = await res.json();
  if (!cfg.apiKey || !cfg.projectId || !cfg.messagingSenderId || !cfg.appId) return null;
  return cfg;
}

async function fetchVapidKey() {
  const res = await fetch('/api/notifications/vapid-public-key');
  if (!res.ok) return null;
  const data: any = await res.json();
  return data.publicKey || null;
}

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subscribeViaFCM = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [config, vapidKey] = await Promise.all([fetchFirebaseConfig(), fetchVapidKey()]);
      if (!config) throw new Error('Firebase configuration unavailable from server.');
      if (!vapidKey) throw new Error('VAPID public key not available from server.');

      const app = getApps().length ? getApps()[0] : initializeApp(config);
      let messaging;
      try {
        messaging = getMessaging(app);
      } catch {
        throw new Error('Firebase Cloud Messaging is not available in this browser.');
      }

      let swReg: ServiceWorkerRegistration;
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch {
        throw new Error('Could not register the notifications service worker.');
      }

      if (!swReg || !swReg.active) {
        throw new Error('Service worker registered but failed to activate.');
      }

      const fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (!fcmToken) throw new Error('FCM returned an empty token. Permission may have been denied.');

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
      if (!res.ok) throw new Error('Server rejected the FCM token registration.');

      setPermission('granted');
      setShowBanner(false);
      setErrorMessage(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'FCM setup failed.';
      console.warn('FCM subscription failed:', msg);
      setErrorMessage(msg);
    }
  }, []);

  const requestPermission = async () => {
    setErrorMessage(null);
    let result: NotificationPermission;
    try {
      result = await Notification.requestPermission();
    } catch {
      setErrorMessage('Notification permission request was blocked by the browser.');
      return;
    }
    setPermission(result);
    if (result === 'granted') {
      try {
        await subscribeViaFCM();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to subscribe to notifications.';
        setErrorMessage(msg);
        setShowBanner(true);
      }
    } else if (result === 'denied') {
      setErrorMessage('Notifications are blocked. Enable them in your browser settings.');
      setShowBanner(false);
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
          subscribeViaFCM().catch((err) => {
            const msg = err instanceof Error ? err.message : 'Failed to subscribe to notifications.';
            setErrorMessage(msg);
          });
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
            {errorMessage && (
              <p className="text-red-400 text-xs mt-2 leading-relaxed">
                {errorMessage}
              </p>
            )}
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
