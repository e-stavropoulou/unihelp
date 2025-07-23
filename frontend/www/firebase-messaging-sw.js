// src/firebase-messaging-sw.js

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
