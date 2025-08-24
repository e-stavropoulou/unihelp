
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
  apiKey: "AIzaSyB4jRTATu4V9_rEK1qzRKTuOU1sFtA8d1g",
  authDomain: "unihelp-notifications.firebaseapp.com",
  projectId: "unihelp-notifications",
  storageBucket: "unihelp-notifications.appspot.com",
  messagingSenderId: "480151685287",
  appId: "1:480151685287:web:c7f858997f9a52055af382",
  measurementId: "G-YHWF328860"
});

const messaging = firebase.messaging();

