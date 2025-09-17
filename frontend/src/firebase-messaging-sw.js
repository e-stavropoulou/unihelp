
try {
  // Αν τρέχει σε Capacitor WebView, service workers δεν παίζουν
  if (!self || !self.registration) {
    console.log("🚫 Service Worker not supported in this environment");
    self.close();
  }
} catch (e) {
  console.log("🚫 SW init blocked:", e);
  self.close();
}


// Firebase setup (legacy compat mode)
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  $1FAKE_FIREBASE_WEB_API_KEY$2,
  authDomain: "unihelp-notifications.firebaseapp.com",
  projectId: "unihelp-notifications",
  storageBucket: "unihelp-notifications.appspot.com",
  $1FAKE_SENDER_ID$2,
  $1FAKE_APP_ID$2,
  $1FAKE_MEASUREMENT_ID$2
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('📩 [SW] Background message:', payload);
  self.registration.showNotification(payload.notification?.title || 'UniHelp', {
    body: payload.notification?.body || '',
    icon: '/assets/img/icons/icon-192x192.png'
  });
});
