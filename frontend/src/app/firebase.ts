// src/app/firebase.ts
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  Messaging
} from 'firebase/messaging';

// ✅ Αρχικοποίηση Firebase πάντα
export const firebaseApp = initializeApp(environment.firebase);

// ✅ Helper για Web only
export const isWeb = !Capacitor.isNativePlatform();

// ✅ Async getter για messaging που επιστρέφει μόνο αν υποστηρίζεται
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isWeb) return null;

  const supported = await isSupported();
  if (!supported) {
    console.warn('❌ Firebase messaging not supported in this browser.');
    return null;
  }

  return getMessaging(firebaseApp);
}

// ✅ Κλασικά exports
export { getToken, onMessage };
