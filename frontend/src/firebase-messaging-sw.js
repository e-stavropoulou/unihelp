// src/firebase-messaging-sw.js

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

// Optional: Customize background notification handling
messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'UniHelp';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message!',
    icon: '/assets/icon/favicon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
