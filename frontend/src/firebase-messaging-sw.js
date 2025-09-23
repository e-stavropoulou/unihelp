

// Firebase setup (legacy compat mode)
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB4jRTATu4V9_rEK1qzRKTuOU1sFtA8d1g",
  authDomain: "unihelp-notifications.firebaseapp.com",
  projectId: "unihelp-notifications",
  storageBucket: "unihelp-notifications.appspot.com",
  messagingSenderId: "480151685287",
  appId: "1:480151685287:web:c7f858997f9a52055af382",
  measurementId: "G-YHWF328860"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('📩 [SW] Background message:', payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const notificationTitle = notification.title || 'UniHelp';
  const notificationOptions = {
    body: notification.body || 'Νέα ειδοποίηση',
    icon: '/assets/icons/icon-192x192.png',
    data: data 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
  console.log('🔔 Notification click: ', event);

  const urlToOpen = new URL('/', self.location.origin).href;

  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
