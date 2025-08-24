import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

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
export async function registerFcmToken(): Promise<void> {
  if (isWeb) {
    // --- Web flow ---
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    try {
      const { getToken } = await import('firebase/messaging');
      const currentToken = await getToken(messaging, {
        vapidKey: environment.vapidKey
      });

      if (currentToken) {
        console.log('🌐 Web FCM Token:', currentToken);
        localStorage.setItem('fcm_token', currentToken);
      } else {
        console.warn('⚠️ Δεν δημιουργήθηκε Web FCM token.');
      }
    } catch (err) {
      console.error('❌ Σφάλμα Web FCM:', err);
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
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📩 Notification received:', notification);
      });

    } catch (err) {
      console.error('❌ Σφάλμα Native FCM:', err);
    }
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
