import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance, getToken } from 'src/app/firebase';
import { initPushCapacitor } from './push-capacitor';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {
    this.initPush();
  }

  ngOnInit() {
    // Το origin του admin από το environment
    const adminOrigin = environment.ADMIN_ORIGIN;

    // Listener για μηνύματα μόνο όταν τρέχει η εφαρμογή σε web (όχι native)
    if (Capacitor.getPlatform() === 'web') {
      window.addEventListener('message', (event) => {
        console.log('📥 [UniHelp] Λάβαμε μήνυμα:', event);

        // Δέχεται μόνο από το admin origin
        if (event.origin !== adminOrigin) {
          console.warn('❌ [UniHelp] Αγνοείται μήνυμα από:', event.origin);
          return;
        }

        // Αν ζητηθεί το token, το στέλνουμε πίσω
        if (event.data === 'REQUEST_TOKEN') {
          const token = localStorage.getItem('token');
          console.log('🔑 [UniHelp] Στέλνω token πίσω:', token);

          (event.source as WindowProxy)?.postMessage(
            { type: 'TOKEN_RESPONSE', token },
            event.origin
          );
        }
      });
    }
  }

  async initPush() {
    if (Capacitor.getPlatform() === 'web') {
      this.initWebPush();
    } else {
      await initPushCapacitor();
    }
  }

  async initWebPush() {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.warn('⚠️ Firebase messaging not supported or not initialized.');
        return;
      }

      const currentToken = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey
      });

      if (currentToken) {
        console.log('📲 Web Token:', currentToken);
        this.saveTokenToBackend(currentToken);
      } else {
        console.warn('⚠️ No registration token available.');
      }
    } catch (err) {
      console.error('❌ Error getting web push token:', err);
    }
  }

  saveTokenToBackend(token: string) {
    const jwt = localStorage.getItem('token');
    if (!jwt) {
      console.warn('⛔ No JWT token found. Skipping token upload.');
      return;
    }

    this.http.post(`${environment.API_URL}/update-fcm-token`, {
      fcm_token: token
    }, {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    }).subscribe({
      next: () => console.log('✅ Token saved to backend'),
      error: err => console.error('❌ Failed to save token:', err)
    });
  }
}
