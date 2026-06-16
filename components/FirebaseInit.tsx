'use client';

import { useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/contexts/ToastContext';

const DEVICE_ID_KEY = 'lms_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

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
  const data = await res.json();
  return data.publicKey || null;
}

function FirebaseInitInner() {
  const initRef = useRef(false);
  const { info: showInfo } = useToast();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const deviceId = getOrCreateDeviceId();

    const init = async () => {
      const [config, vapidKey] = await Promise.all([fetchFirebaseConfig(), fetchVapidKey()]);
      if (!config || !vapidKey) {
        console.warn('Firebase config or VAPID key not available from server');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const app = getApps().length ? getApps()[0] : initializeApp(config);
      let messaging;
      try {
        messaging = getMessaging(app);
      } catch {
        return;
      }

      let swReg: ServiceWorkerRegistration | null = null;
      try {
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch {
        return;
      }

      if (!swReg || !swReg.active) return;

      let currentToken = '';
      try {
        currentToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swReg,
        });
      } catch (err) {
        console.error('FCM getToken failed:', err);
        return;
      }

      if (currentToken) {
        const regRes = await fetch('/api/notifications/register-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fcm_token: currentToken,
            platform: 'web',
            device_id: deviceId,
            user_agent: navigator.userAgent,
          }),
        });
        if (!regRes.ok) {
          const regErr = await regRes.text().catch(() => 'Unknown error');
          console.error('register-device failed:', regRes.status, regErr);
        }
      }

      const unsubscribe = onMessage(messaging, (payload: any) => {
        const title = payload.notification?.title || payload.data?.title || 'Adityanveshan';
        const body = payload.notification?.body || payload.data?.body || '';
        if (title && body) {
          showInfo(`${title}: ${body}`);
        }
      });

      // No cleanup needed for unsubscribe since init runs once; but keep it proper
      // (cleanup runs on unmount, not on re-run thanks to initRef)
    };

    init();

    return () => {
      initRef.current = false;
    };
  }, [showInfo]);

  return null;
}

export default function FirebaseInit() {
  return <FirebaseInitInner />;
}
