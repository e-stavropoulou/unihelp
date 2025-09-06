// src/main.ts

import { defineCustomElements } from '@ionic/core/loader'; // 👈 1ο πράγμα που τρέχει

defineCustomElements(window);  // 👈 ΠΡΙΝ το bootstrapApplication

// ✅ Global override για να πιάσεις τα "ERROR {}"
const originalError = console.error;
console.error = (...args: any[]) => {
  originalError('🔎 Intercepted console.error:', ...args);

  try {
    if (args[0] instanceof Error) {
      originalError('🔎 Stacktrace:', args[0].stack);
    } else {
      // Πάντα trace όταν είναι object
      try {
        originalError('🔎 JSON error:', JSON.stringify(args[0]));
      } catch {
        originalError('🔎 Could not stringify arg[0]');
      }
      console.trace('🔎 Console.error trace (forced)');
    }
  } catch (e) {
    originalError('🔎 Failed inside console.error override:', e);
  }
};


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

import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';



// ✅ Δημιουργούμε providers array
const providers: any[] = [
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  provideIonicAngular(),
  provideRouter(routes, withPreloading(PreloadAllModules)),
  provideHttpClient(),
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideServiceWorker('ngsw-worker.js', {
    enabled: !isDevMode(),
    registrationStrategy: 'registerWhenStable:30000'
  })
];

// ✅ Προσθέτουμε το firebase-messaging-sw.js ΜΟΝΟ αν είναι ενεργό στο environment
if (environment.enableFirebaseMessagingSW) {
  providers.push(
    provideServiceWorker('firebase-messaging-sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  );
}

// ✅ Bootstrap Angular App
bootstrapApplication(AppComponent, {
  providers
});

