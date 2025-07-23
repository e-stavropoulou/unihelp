// src/app/push-capacitor.ts
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';

export const initPushCapacitor = async () => {
  if (Capacitor.getPlatform() === 'web') {
    console.log('🚫 Push notifications not supported on web (use firebase.messaging instead)');
    return;
  }

  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== 'granted') {
    throw new Error('❌ Permission not granted for push notifications');
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token: Token) => {
    console.log('📲 Push token (Capacitor):', token.value);

    // ✅ Στείλε token στον backend
    const jwt = localStorage.getItem('access_token');
    if (!jwt) {
      console.warn('⛔ No JWT token found. Skipping token upload.');
      return;
    }

    fetch('https://YOUR_BACKEND_DOMAIN/update-fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ fcm_token: token.value }),
    })
      .then((res) => {
        if (res.ok) {
          console.log('✅ Token saved to backend');
        } else {
          console.warn('⚠️ Failed to save token');
        }
      })
      .catch((err) => {
        console.error('❌ Error saving token:', err);
      });
  });

  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('🔔 Received push notification:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('👆 User tapped push notification:', action);
  });
};
