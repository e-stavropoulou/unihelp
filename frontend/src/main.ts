// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular
} from '@ionic/angular/standalone';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

import { provideHttpClient } from '@angular/common/http';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { environment } from './environments/environment';

import { Capacitor } from '@capacitor/core';

// ✅ Αν είμαστε σε browser, κάνε register τον Service Worker για Firebase Messaging
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✅ Firebase service worker registered:', registration);
    })
    .catch((err) => {
      console.warn('❌ Firebase service worker registration failed:', err);
    });
}

// ✅ Bootstrap app με Angular & Firebase app (μόνο το core)
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase))
    // ⛔ ΟΧΙ provideMessaging εδώ — το κάνεις μόνος σου στο firebase.ts
  ]
});
