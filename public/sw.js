self.addEventListener('push', function(event) {
  let data = { title: 'New Notification', body: 'You have a new message' };
  try {
    data = event.data.json();
  } catch (e) {
    console.log('Push data is not JSON:', event.data ? event.data.text() : 'no data');
  }

  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/logo.png',
    // badge: '/badge.png',  // Removed: file not present, causes 404
    vibrate: [100, 50, 100],
    tag: data.tag || 'default-notification', // Prevents duplicate notifications
    renotify: false,
    data: data.data || { url: '/dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Adityanveshan', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if any tab is already open with the same origin
      for (let i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        // Focus existing tab if it's on the same site
        if ('focus' in client) {
          client.focus();
          // Navigate to target URL if possible
          if (client.navigate) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // No existing tab found — open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
