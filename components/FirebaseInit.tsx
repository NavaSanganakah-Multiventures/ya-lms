'use client';

import { useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/contexts/ToastContext';

const DEVICE_ID_KEY = 'lms_device_id';

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCBnwhTTM3w8aiXHxC_4rX6aonhIe3wjqo',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'navasanganakah',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1006899144467',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

const VAPID_PUBLIC_KEY = 'BCJIqQGIznc_xAHgTIvzcGQc2jrsheZU2wPIHhx-1sHUjAdumR4yiqVeyGLqT1vN5fIzz4JzaByUdKWSD86K7hw';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function FirebaseInitInner() {
  const initRef = useRef(false);
  const { info: showInfo } = useToast();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let app: any = null;
    let messaging: any = null;
    let unsubscribe: (() => void) | null = null;
    const deviceId = getOrCreateDeviceId();

    const init = async () => {
      if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) return;

      if (!getApps().length) {
        app = initializeApp(FIREBASE_CONFIG);
      } else {
        app = getApps()[0];
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      try {
        messaging = getMessaging(app);

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
            vapidKey: VAPID_PUBLIC_KEY,
            serviceWorkerRegistration: swReg,
          });
        } catch {
          return;
        }

        if (currentToken) {
          await fetch('/api/notifications/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fcm_token: currentToken,
              platform: 'web',
              device_id: deviceId,
              user_agent: navigator.userAgent,
            }),
          });
        }

        unsubscribe = onMessage(messaging, (payload: any) => {
          const title = payload.notification?.title || payload.data?.title || 'Adityanveshan';
          const body = payload.notification?.body || payload.data?.body || '';
          if (title && body) {
            showInfo(`${title}: ${body}`);
          }
        });
      } catch {
        // messaging not supported
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [showInfo]);

  return null;
}

export default function FirebaseInit() {
  return <FirebaseInitInner />;
}
