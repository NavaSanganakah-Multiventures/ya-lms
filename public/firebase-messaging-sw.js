importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

self.addEventListener('fetch', () => {});

self.addEventListener('install', () => {
  self.skipWaiting();
});

async function loadFirebaseConfig() {
  try {
    const res = await fetch('/api/firebase/config');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function initializeFirebase() {
  const config = await loadFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) return null;

  firebase.initializeApp({
    apiKey: config.apiKey,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId || '',
    appId: config.appId || '',
  });

  return firebase.messaging();
}

let messagingPromise = initializeFirebase();

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'New Notification', body: event.data.text() };
  }

  const title = data.notification?.title || data.title || 'Adityanveshan';
  const options = {
    body: data.notification?.body || data.body || '',
    icon: data.notification?.icon || data.icon || '/icon.png',
    badge: data.notification?.badge || '/icon.png',
    data: data.data || { url: data.clickUrl || '/' },
    requireInteraction: true,
    actions: data.actions || [],
    tag: data.tag || 'default',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || notificationData.clickUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === new URL(targetUrl, self.location.origin).href && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

messagingPromise.then((messaging) => {
  if (messaging) {
    messaging.onBackgroundMessage(function (payload) {
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Adityanveshan';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || '/icon.png',
        badge: '/icon.png',
        data: payload.data || { url: '/' },
        requireInteraction: true,
        tag: payload.data?.tag || 'fcm_background',
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});
