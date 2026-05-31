'use client';

import { useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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

export default function FirebaseInit() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let app: any = null;
    let messaging: any = null;
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
        } catch {
          // messaging not supported
        }
      } catch {
        // config not available
      }
    };

    init();
  }, []);

  return null;
}
