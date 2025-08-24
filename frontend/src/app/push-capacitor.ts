// src/app/push-capacitor.ts
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { environment } from 'src/environments/environment';

export const initPushCapacitor = async () => {
  if (Capacitor.getPlatform() === 'web') {
    console.log('🚫 Push notifications not supported on web (use firebase.messaging instead)');
    return;
  }

  // 🔹 Ζήτα άδεια από τον χρήστη
  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== 'granted') {
    throw new Error('❌ Permission not granted for push notifications');
  }

  // 🔹 Κάνε register στο APNS/FCM
  await PushNotifications.register();

  // 🔹 Token που έδωσε το APNS/FCM
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('📲 Push token (Capacitor):', token.value);

    const jwt = localStorage.getItem('token'); // 👈 consistent με το app σου
    if (!jwt) {
      console.warn('⛔ No JWT token found. Skipping token upload.');
      return;
    }

    try {
      const res = await fetch(`${environment.API_URL}/update-fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ fcm_token: token.value }),
      });

      if (res.ok) {
        console.log('✅ Token saved to backend');
      } else {
        console.warn('⚠️ Failed to save token. Status:', res.status);
      }
    } catch (err) {
      console.error('❌ Error saving token:', err);
    }
  });

  // 🔹 Ειδοποίηση που ήρθε ενώ η εφαρμογή είναι ανοιχτή
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('🔔 Received push notification:', notification);
  });

  // 🔹 Ο χρήστης πάτησε πάνω στην ειδοποίηση
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('👆 User tapped push notification:', action);
    // 👉 εδώ μπορείς να κάνεις redirect π.χ. σε συγκεκριμένο chat
  });
};
