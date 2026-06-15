'use client';

import { useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/contexts/ToastContext';

type FirebaseConfig = {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

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
      try {
        const configRes = await fetch('/api/firebase/config');
        if (!configRes.ok) return;
        const config: FirebaseConfig = await configRes.json();

        if (!config.apiKey || !config.projectId) return;

        if (!getApps().length) {
          app = initializeApp(config);
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

          let vapidKey = '';
          try {
            const vapidRes = await fetch('/api/notifications/vapid-public-key');
            if (vapidRes.ok) {
              const vapidData: any = await vapidRes.json();
              vapidKey = vapidData.publicKey || '';
            }
          } catch {}

          if (vapidKey) {
            let currentToken = '';
            try {
              currentToken = await getToken(messaging, {
                vapidKey,
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
      } catch {
        // config not available
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
