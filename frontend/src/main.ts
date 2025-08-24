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
