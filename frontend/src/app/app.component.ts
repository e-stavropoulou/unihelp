import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Capacitor } from '@capacitor/core';
import { getMessagingInstance, getToken } from 'src/app/firebase';
import { initPushCapacitor } from './push-capacitor'; // ✅ import το αρχείο σου

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private http: HttpClient) {
    this.initPush(); // ένα κοινό entry point
  }

  async initPush() {
    if (Capacitor.getPlatform() === 'web') {
      this.initWebPush(); // 🔔 Firebase push (browser)
    } else {
      await initPushCapacitor(); // 🔔 Native push (Capacitor iOS/Android)
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
    const jwt = localStorage.getItem('access_token');
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
