import { initializeApp } from 'firebase/app';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getMessaging, deleteToken } from "firebase/messaging"

// ✅ Firebase init
export const firebaseApp = initializeApp(environment.firebase);

// ✅ Flag για Web vs Native
export const isWeb = !Capacitor.isNativePlatform();


// ✅ Web only: επιστρέφει messaging instance
export async function getMessagingInstance() {
  if (!isWeb) return null;

  // Dynamic import -> δεν φορτώνεται ποτέ σε iOS/Android
  const { getMessaging, isSupported } = await import('firebase/messaging');

  const supported = await isSupported();
  if (!supported) {
    console.warn('❌ Firebase messaging not supported in this browser.');
    return null;
  }
  return getMessaging(firebaseApp);
}


// ✅ Εγγραφή token ανάλογα με την πλατφόρμα
export async function registerFcmToken(): Promise<string | null> {
  if (isWeb) {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    try {
      const { getToken } = await import('firebase/messaging');
      const currentToken = await getToken(messaging, {
        vapidKey: environment.vapidKey
      });

      if (currentToken) {
        console.log('🌐 Web FCM Token:', currentToken);
        localStorage.setItem('fcm_token', currentToken);
        await sendTokenToBackend(currentToken);
        return currentToken;   // ✅ επιστρέφει το token
      } else {
        console.warn('⚠️ Δεν δημιουργήθηκε Web FCM token.');
        return null;
      }
    } catch (err) {
      console.error('❌ Σφάλμα Web FCM:', err);
      return null;
    }
  } else {
    // --- Native flow (iOS/Android) ---
    try {
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
      }

      PushNotifications.addListener('registration', (token) => {
        console.log('📱 Native FCM Token:', token.value);
        localStorage.setItem('fcm_token', token.value);
        sendTokenToBackend(token.value);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📩 Notification received:', notification);
      });

    } catch (err) {
      console.error('❌ Σφάλμα Native FCM:', err);
    }

    return null; // ✅ consistency στην Promise
  }
}


// ✅ Web only: service worker registration
if (isWeb && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✅ Firebase service worker registered:', registration);
    })
    .catch((err) => {
      console.error('❌ Firebase service worker registration failed:', err);
    });
}


// ✅ Safe exports για web μόνο (lazy import)
export async function getTokenWeb(messaging: any, options?: any) {
  if (!isWeb) return undefined;
  const { getToken } = await import('firebase/messaging');
  return getToken(messaging, options);
}

export async function onMessageWeb(messaging: any, callback: any) {
  if (!isWeb) return undefined;
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, callback);
}

async function sendTokenToBackend(token: string) {
  const jwt = localStorage.getItem('token'); // ή από AuthService
  if (!jwt) return;
  await fetch(`${environment.API_URL}/update-fcm-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({ fcm_token: token })
  });
}

export async function clearFcmToken() {
  const messaging = await getMessagingInstance();
  if (!messaging) return;
  try {
    const currentToken = localStorage.getItem("fcm_token");
    if (currentToken) {
      await deleteToken(messaging);
      localStorage.removeItem("fcm_token");
      console.log("🗑️ FCM token deleted");

      // 👇 ενημέρωσε και backend (προαιρετικό αλλά καλό να γίνει)
      const jwt = localStorage.getItem("token");
      if (jwt) {
        await fetch(`${environment.API_URL}/update-fcm-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
          },
          body: JSON.stringify({ fcm_token: null })
        });
      }
    }
  } catch (err) {
    console.error("❌ Failed to delete FCM token:", err);
  }
}