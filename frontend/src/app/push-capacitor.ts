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

  try {
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      throw new Error('❌ Permission not granted for push notifications');
    }

    await PushNotifications.register();
    console.log('✅ Push registration requested');

    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('📲 Push token (Capacitor):', token.value);

      const jwt = localStorage.getItem('token');
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

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('🔔 Received push notification:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('👆 User tapped push notification:', action);
    });

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('❌ Push setup failed:', err.message);
    } else if (typeof err === 'object' && err !== null) {
      console.error('❌ Push setup failed:', JSON.stringify(err));
    } else {
      console.error('❌ Push setup failed (non-object):', String(err));
    }
  }
  
  
};
