self.addEventListener('push', function(event) {
  let data = { title: 'New Notification', body: 'You have a new message' };
  try {
    data = event.data.json();
  } catch (e) {
    console.log('Push data is not JSON:', event.data.text());
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
