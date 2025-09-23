// src/main.ts

import { defineCustomElements } from '@ionic/core/loader';
defineCustomElements(window);

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

import { isDevMode, ErrorHandler } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { withInterceptors } from '@angular/common/http';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './app/global-error-handler';

// Providers array
const providers: any[] = [
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  { provide: ErrorHandler, useClass: GlobalErrorHandler },

  provideIonicAngular(),
  provideRouter(routes, withPreloading(PreloadAllModules)),
  provideHttpClient(withInterceptors([AuthInterceptor])),
  provideFirebaseApp(() => initializeApp(environment.firebase)),

  // Angular Service Worker (caching/PWA)
  provideServiceWorker('ngsw-worker.js', {
    enabled: !isDevMode(),
    registrationStrategy: 'registerWhenStable:30000'
  }),

  // Firebase Service Worker (push)
  provideServiceWorker('firebase-messaging-sw.js', {
    enabled: !isDevMode(),
    registrationStrategy: 'registerWhenStable:31000' // λίγα ms μετά τον ngsw
  })
];

// Bootstrap Angular App
bootstrapApplication(AppComponent, {
  providers
}).then(() => {
  console.log("🟢 Angular app bootstrapped με NGSW + Firebase SW providers");
});
